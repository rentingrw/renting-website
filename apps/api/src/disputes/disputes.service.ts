import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BookingStatus, DisputeStatus, type User } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { NotificationsService } from '../notifications/notifications.service';
import { realtimeEvents } from '../realtime/realtime.events';
import { TrustScoreService } from '../trust-score/trust-score.service';
import type { CreateDisputeDto } from './dto/create-dispute.dto';
import type { DismissDisputeDto } from './dto/dismiss-dispute.dto';
import type { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import {
  disputeOpenedEmailHtml,
  disputeResolvedEmailHtml,
  disputeDismissedEmailHtml,
} from '../notifications/email-templates';

const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = [
  DisputeStatus.open,
  DisputeStatus.under_review,
  DisputeStatus.waiting_evidence,
  DisputeStatus.escalated,
];

const DISPUTABLE_BOOKING_STATUSES = new Set<BookingStatus>([
  BookingStatus.active,
  BookingStatus.completed,
  BookingStatus.auto_completed,
]);

@Injectable()
export class DisputesService {
  constructor(
    private readonly trustScoreService: TrustScoreService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(authUser: AuthenticatedUser, payload: CreateDisputeDto) {
    const openedBy = await this.requireUser(authUser.clerkUserId);

    if (!payload.carBookingId && !payload.driverBookingId) {
      throw new BadRequestException('carBookingId or driverBookingId is required.');
    }
    if (payload.carBookingId && payload.driverBookingId) {
      throw new BadRequestException('Provide only one booking identifier.');
    }

    const created = payload.carBookingId
      ? await this.createForCarBooking(openedBy.id, payload)
      : await this.createForDriverBooking(openedBy.id, payload);

    this.notificationsService.emitInAppToAdmin(realtimeEvents.disputeOpened, {
      dispute: created.dispute,
      bookingType: created.bookingType,
      bookingId: created.bookingId,
    });
    this.notificationsService.emitInAppToUsers(
      [created.firstPartyId, created.secondPartyId],
      realtimeEvents.disputeOpened,
      {
        dispute: created.dispute,
        bookingType: created.bookingType,
        bookingId: created.bookingId,
      },
    );
    this.notificationsService.queueEmailToUsers(
      [created.firstPartyId, created.secondPartyId],
      'Dispute opened on Rentingi',
      'A dispute has been opened for your booking. Our support team will review it shortly.',
      disputeOpenedEmailHtml('there'),
    );

    return created.dispute;
  }

  async getById(authUser: AuthenticatedUser, disputeId: string) {
    const currentUser = await this.requireUser(authUser.clerkUserId);
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        openedBy: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        againstUser: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        resolvedBy: {
          select: { id: true, fullName: true },
        },
        carBooking: {
          select: { id: true, status: true, startDate: true, endDate: true },
        },
        driverBooking: {
          select: { id: true, status: true, startAt: true, endAt: true },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found.');
    }

    if (authUser.role === 'admin') {
      return dispute;
    }

    const canView = dispute.openedById === currentUser.id || dispute.againstUserId === currentUser.id;
    if (!canView) {
      throw new ForbiddenException('You cannot view this dispute.');
    }

    return {
      id: dispute.id,
      status: dispute.status,
      reason: dispute.reason,
      resolutionNote: dispute.resolutionNote,
      createdAt: dispute.createdAt,
      resolvedAt: dispute.resolvedAt,
      openedBy: dispute.openedBy,
      againstUser: dispute.againstUser,
      carBooking: dispute.carBooking,
      driverBooking: dispute.driverBooking,
    };
  }

  async resolve(authUser: AuthenticatedUser, disputeId: string, payload: ResolveDisputeDto) {
    const adminUser = await this.requireUser(authUser.clerkUserId);
    const dispute = await this.requireDispute(disputeId);

    if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
      throw new BadRequestException('Only open disputes can be resolved.');
    }

    const resolved = await prisma.$transaction(async (tx) => {
      const updatedDispute = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: DisputeStatus.resolved,
          resolutionNote: payload.resolutionNote,
          adminNotes: payload.adminNotes,
          resolvedById: adminUser.id,
          resolvedAt: new Date(),
        },
      });

      if (dispute.carBookingId) {
        await tx.carBooking.update({
          where: { id: dispute.carBookingId },
          data: {
            status:
              payload.bookingOutcome === 'cancelled_admin'
                ? BookingStatus.cancelled_admin
                : BookingStatus.auto_completed,
            completedAt: payload.bookingOutcome === 'auto_completed' ? new Date() : undefined,
          },
        });
      }

      if (dispute.driverBookingId) {
        await tx.driverBooking.update({
          where: { id: dispute.driverBookingId },
          data: {
            status:
              payload.bookingOutcome === 'cancelled_admin'
                ? BookingStatus.cancelled_admin
                : BookingStatus.auto_completed,
            completedAt: payload.bookingOutcome === 'auto_completed' ? new Date() : undefined,
          },
        });
      }

      return updatedDispute;
    });

    if (payload.trustAdjustments?.length) {
      for (const adjustment of payload.trustAdjustments) {
        await this.trustScoreService.recordManualAdjustment({
          userId: adjustment.userId,
          delta: adjustment.delta,
          reason: adjustment.reason,
          carBookingId: dispute.carBookingId ?? undefined,
          driverBookingId: dispute.driverBookingId ?? undefined,
          metadata: {
            disputeId: dispute.id,
          },
        });
      }
    }

    this.notificationsService.queueEmailToUsers(
      [resolved.openedById, resolved.againstUserId],
      'Dispute resolved on Rentingi',
      'Your dispute has been resolved. Please check your booking details for the final outcome.',
      disputeResolvedEmailHtml('there'),
    );
    this.notificationsService.emitInAppToUsers(
      [resolved.openedById, resolved.againstUserId],
      realtimeEvents.disputeResolved,
      {
        disputeId: resolved.id,
        status: resolved.status,
        bookingOutcome: payload.bookingOutcome,
      },
    );
    this.notificationsService.queueSmsToUsers(
      [resolved.openedById, resolved.againstUserId],
      'Your Rentingi dispute has been resolved. Please open the app to review the final decision.',
    );

    return resolved;
  }

  async resolveAsAdmin(disputeId: string, payload: ResolveDisputeDto) {
    const dispute = await this.requireDispute(disputeId);

    if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
      throw new BadRequestException('Only open disputes can be resolved.');
    }

    const resolved = await prisma.$transaction(async (tx) => {
      const updatedDispute = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: DisputeStatus.resolved,
          resolutionNote: payload.resolutionNote,
          adminNotes: payload.adminNotes,
          resolvedById: null,
          resolvedAt: new Date(),
        },
      });

      if (dispute.carBookingId) {
        await tx.carBooking.update({
          where: { id: dispute.carBookingId },
          data: {
            status:
              payload.bookingOutcome === 'cancelled_admin'
                ? BookingStatus.cancelled_admin
                : BookingStatus.auto_completed,
            completedAt: payload.bookingOutcome === 'auto_completed' ? new Date() : undefined,
          },
        });
      }

      if (dispute.driverBookingId) {
        await tx.driverBooking.update({
          where: { id: dispute.driverBookingId },
          data: {
            status:
              payload.bookingOutcome === 'cancelled_admin'
                ? BookingStatus.cancelled_admin
                : BookingStatus.auto_completed,
            completedAt: payload.bookingOutcome === 'auto_completed' ? new Date() : undefined,
          },
        });
      }

      return updatedDispute;
    });

    if (payload.trustAdjustments?.length) {
      for (const adjustment of payload.trustAdjustments) {
        await this.trustScoreService.recordManualAdjustment({
          userId: adjustment.userId,
          delta: adjustment.delta,
          reason: adjustment.reason,
          carBookingId: dispute.carBookingId ?? undefined,
          driverBookingId: dispute.driverBookingId ?? undefined,
          metadata: { disputeId: dispute.id },
        });
      }
    }

    this.notificationsService.queueEmailToUsers(
      [resolved.openedById, resolved.againstUserId],
      'Dispute resolved on Rentingi',
      'Your dispute has been resolved. Please check your booking details for the final outcome.',
      disputeResolvedEmailHtml('there'),
    );
    this.notificationsService.emitInAppToUsers(
      [resolved.openedById, resolved.againstUserId],
      realtimeEvents.disputeResolved,
      { disputeId: resolved.id, status: resolved.status, bookingOutcome: payload.bookingOutcome },
    );
    this.notificationsService.queueSmsToUsers(
      [resolved.openedById, resolved.againstUserId],
      'Your Rentingi dispute has been resolved. Please open the app to review the final decision.',
    );

    return resolved;
  }

  async dismissAsAdmin(disputeId: string, payload: DismissDisputeDto) {
    const dispute = await this.requireDispute(disputeId);

    if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
      throw new BadRequestException('Only open disputes can be dismissed.');
    }

    const dismissed = await prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        status: DisputeStatus.rejected,
        adminNotes: payload.adminNotes,
        resolvedById: null,
        resolvedAt: new Date(),
      },
    });

    this.notificationsService.queueEmailToUsers(
      [dismissed.openedById, dismissed.againstUserId],
      'Dispute update on Rentingi',
      'A dispute was reviewed and dismissed by support. Please contact support if you need clarification.',
      disputeDismissedEmailHtml('there'),
    );

    return dismissed;
  }

  async escalate(authUser: AuthenticatedUser, disputeId: string) {
    await this.requireUser(authUser.clerkUserId);
    const dispute = await this.requireDispute(disputeId);

    if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
      throw new BadRequestException('Only open disputes can be escalated.');
    }

    const escalated = await prisma.dispute.update({
      where: { id: dispute.id },
      data: { status: DisputeStatus.escalated },
    });

    this.notificationsService.emitInAppToAdmin(realtimeEvents.disputeOpened, {
      disputeId: escalated.id,
      escalated: true,
      bookingId: escalated.carBookingId ?? escalated.driverBookingId,
    });

    return escalated;
  }

  async dismiss(authUser: AuthenticatedUser, disputeId: string, payload: DismissDisputeDto) {
    const adminUser = await this.requireUser(authUser.clerkUserId);
    const dispute = await this.requireDispute(disputeId);

    if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
      throw new BadRequestException('Only open disputes can be dismissed.');
    }

    const dismissed = await prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        status: DisputeStatus.rejected,
        adminNotes: payload.adminNotes,
        resolvedById: adminUser.id,
        resolvedAt: new Date(),
      },
    });

    this.notificationsService.queueEmailToUsers(
      [dismissed.openedById, dismissed.againstUserId],
      'Dispute update on Rentingi',
      'A dispute was reviewed and dismissed by support. Please contact support if you need clarification.',
      disputeDismissedEmailHtml('there'),
    );

    return dismissed;
  }

  private async createForCarBooking(openedById: string, payload: CreateDisputeDto) {
    const booking = await prisma.carBooking.findUnique({
      where: { id: payload.carBookingId },
      select: {
        id: true,
        renterId: true,
        ownerId: true,
        status: true,
        endDate: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Car booking not found.');
    }

    const againstUserId = openedById === booking.renterId ? booking.ownerId : booking.renterId;
    const isParticipant = [booking.renterId, booking.ownerId].includes(openedById);
    if (!isParticipant) {
      throw new ForbiddenException('Only booking participants can open a dispute.');
    }

    this.assertBookingCanBeDisputed(booking.status);
    this.assertDisputeWindow(booking.endDate);
    await this.ensureNoActiveDispute({ carBookingId: booking.id });

    return prisma.$transaction(async (tx) => {
      await tx.carBooking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.disputed,
        },
      });

      const dispute = await tx.dispute.create({
        data: {
          openedById,
          againstUserId,
          carBookingId: booking.id,
          reason: payload.reason,
          description: payload.description,
        },
      });

      return {
        dispute,
        bookingType: 'car' as const,
        bookingId: booking.id,
        firstPartyId: booking.ownerId,
        secondPartyId: booking.renterId,
      };
    });
  }

  private async createForDriverBooking(openedById: string, payload: CreateDisputeDto) {
    const booking = await prisma.driverBooking.findUnique({
      where: { id: payload.driverBookingId },
      select: {
        id: true,
        renterId: true,
        driverId: true,
        status: true,
        endAt: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Driver booking not found.');
    }

    const againstUserId = openedById === booking.renterId ? booking.driverId : booking.renterId;
    const isParticipant = [booking.renterId, booking.driverId].includes(openedById);
    if (!isParticipant) {
      throw new ForbiddenException('Only booking participants can open a dispute.');
    }

    this.assertBookingCanBeDisputed(booking.status);
    this.assertDisputeWindow(booking.endAt);
    await this.ensureNoActiveDispute({ driverBookingId: booking.id });

    return prisma.$transaction(async (tx) => {
      await tx.driverBooking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.disputed,
        },
      });

      const dispute = await tx.dispute.create({
        data: {
          openedById,
          againstUserId,
          driverBookingId: booking.id,
          reason: payload.reason,
          description: payload.description,
        },
      });

      return {
        dispute,
        bookingType: 'driver' as const,
        bookingId: booking.id,
        firstPartyId: booking.driverId,
        secondPartyId: booking.renterId,
      };
    });
  }

  private assertDisputeWindow(bookingEndAt: Date) {
    const now = Date.now();
    const bookingEndAtMs = bookingEndAt.getTime();
    const sevenDaysAfterBookingEndMs = bookingEndAtMs + 7 * 24 * 60 * 60 * 1000;

    if (bookingEndAtMs > now || now > sevenDaysAfterBookingEndMs) {
      throw new BadRequestException('Disputes must be opened within 7 days of booking end.');
    }
  }

  private assertBookingCanBeDisputed(status: BookingStatus) {
    if (!DISPUTABLE_BOOKING_STATUSES.has(status)) {
      throw new BadRequestException('Booking is not eligible for disputes yet.');
    }
  }

  private async ensureNoActiveDispute(where: { carBookingId?: string; driverBookingId?: string }) {
    const existing = await prisma.dispute.findFirst({
      where: {
        ...where,
        status: {
          in: ACTIVE_DISPUTE_STATUSES,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('An active dispute already exists for this booking.');
    }
  }

  private async requireDispute(disputeId: string) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found.');
    }

    return dispute;
  }

  private async requireUser(clerkUserId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Sync your account first.');
    }

    return user;
  }
}
