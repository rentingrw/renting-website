import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus, Prisma, type User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { NotificationsService } from '../notifications/notifications.service';
import {
  bookingSubmittedEmailHtml,
  bookingConfirmedEmailHtml,
  bookingDeclinedEmailHtml,
  bookingCompletedEmailHtml,
  bookingDeskRequestEmailHtml,
} from '../notifications/email-templates';
import { realtimeEvents } from '../realtime/realtime.events';
import { TrustScoreService } from '../trust-score/trust-score.service';
import type { CreateDriverBookingDto } from './dto/create-driver-booking.dto';
import {
  maybeStoreRenterPhone,
  normalizeBookingPhone,
  formatContactLine,
} from '../bookings/booking-desk.util';

const BLOCKING_DRIVER_BOOKING_STATUSES = new Set<BookingStatus>([
  BookingStatus.confirmed,
  BookingStatus.active,
  BookingStatus.disputed,
]);
const ACTIVE_DISPUTE_STATUSES = ['open', 'under_review', 'waiting_evidence', 'escalated'] as const;

@Injectable()
export class DriverBookingsService {
  constructor(
    private readonly trustScoreService: TrustScoreService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runDriverBookingLifecycleCron() {
    try {
      await Promise.all([this.autoCancelStalePendingBookings(), this.autoCompleteExpiredActiveBookings()]);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2021') {
        return;
      }
      throw error;
    }
  }

  async create(authUser: AuthenticatedUser, payload: CreateDriverBookingDto) {
    if (payload.startAt >= payload.endAt) {
      throw new BadRequestException('endAt must be after startAt.');
    }

    const renter = await this.requireUser(authUser.clerkUserId);
    const driver = await prisma.user.findUnique({
      where: { id: payload.driverId },
      include: {
        roles: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found.');
    }

    const hasDriverRole = driver.primaryRole === 'driver' || driver.roles.some((item) => item.role === 'driver');
    if (!hasDriverRole) {
      throw new BadRequestException('Target user is not registered as a driver.');
    }
    if (driver.id === renter.id) {
      throw new BadRequestException('You cannot book yourself as driver.');
    }

    await this.ensureNoOverlapForDriver(payload.driverId, payload.startAt, payload.endAt);

    const renterPhone = normalizeBookingPhone(payload.renterPhone);
    await maybeStoreRenterPhone(renter.id, renterPhone);

    const booking = await prisma.driverBooking.create({
      data: {
        driverId: payload.driverId,
        renterId: renter.id,
        serviceType: payload.serviceType,
        startAt: payload.startAt,
        endAt: payload.endAt,
        pickupAddress: payload.pickupAddress,
        dropoffAddress: payload.dropoffAddress,
        totalAmountRwf: payload.totalAmountRwf,
        paymentMethod: payload.paymentMethod,
        notes: payload.notes,
        renterPhone,
        isInstant: false,
        status: BookingStatus.pending,
      },
      include: this.bookingInclude(),
    });

    const title = `Driver service (${booking.serviceType})`;
    this.notificationsService.queueAdminDeskAlert(
      `Booking desk: ${title}`,
      `${booking.renter.fullName} (${renterPhone}) requested ${title}. Pickup ${booking.pickupAddress}.`,
      bookingDeskRequestEmailHtml(
        title,
        booking.renter.fullName,
        renterPhone,
        booking.startAt,
        booking.endAt,
        booking.pickupAddress,
        booking.notes,
      ),
    );
    this.notificationsService.queueEmailToUsers(
      [booking.renterId],
      'Booking request submitted — renting.rw',
      `Your driver booking request was sent to the renting.rw desk.`,
      bookingSubmittedEmailHtml(booking.renter.fullName, title, booking.startAt, booking.endAt),
    );
    this.notificationsService.queueSmsToPhones(
      [renterPhone],
      'Your renting.rw driver request was sent. We will confirm and share the driver contact.',
    );

    return {
      ...booking,
      fulfillment: 'admin_desk' as const,
      providerContact: null,
    };
  }

  async confirm(_authUser: AuthenticatedUser, _bookingId: string) {
    throw new ForbiddenException('Driver bookings are confirmed by the renting.rw desk.');
  }

  async confirmByAdmin(bookingId: string) {
    const booking = await this.requireBooking(bookingId);
    if (booking.status !== BookingStatus.pending) {
      throw new BadRequestException('Only pending bookings can be confirmed.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const confirmed = await tx.driverBooking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.confirmed },
        include: this.bookingInclude(),
      });

      const overlappingBookings = await tx.driverBooking.findMany({
        where: {
          id: { not: booking.id },
          driverId: booking.driverId,
          status: BookingStatus.pending,
          startAt: { lt: booking.endAt },
          endAt: { gt: booking.startAt },
        },
        select: { id: true, renterId: true },
      });

      if (overlappingBookings.length > 0) {
        await tx.driverBooking.updateMany({
          where: { id: { in: overlappingBookings.map((item) => item.id) } },
          data: { status: BookingStatus.overlap_declined },
        });
      }

      return { confirmed, overlappingBookings };
    });

    await this.notifyDriverConfirmed(updated.confirmed);
    return updated.confirmed;
  }

  async decline(_authUser: AuthenticatedUser, _bookingId: string) {
    throw new ForbiddenException('Driver bookings are declined by the renting.rw desk.');
  }

  async rejectByAdmin(bookingId: string) {
    const booking = await this.requireBooking(bookingId);
    if (booking.status !== BookingStatus.pending) {
      throw new BadRequestException('Only pending bookings can be declined.');
    }

    const declined = await prisma.driverBooking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.declined },
      include: this.bookingInclude(),
    });

    this.notificationsService.queueSmsToPhones(
      [declined.renterPhone].filter(Boolean),
      'Your renting.rw driver request was declined. You can request another driver.',
    );
    this.notificationsService.queueEmailToUsers(
      [declined.renterId],
      'Booking declined — renting.rw',
      `Your driver booking request with ${declined.driver.fullName} was declined.`,
      bookingDeclinedEmailHtml(declined.renter.fullName, `Driver: ${declined.driver.fullName}`),
    );

    void this.trustScoreService.recordEvent({
      userId: declined.driverId,
      eventType: 'booking_rejected',
      driverBookingId: declined.id,
      reason: 'Pending driver booking rejected by the renting.rw desk',
    });

    return declined;
  }

  async tryNextByAdmin(bookingId: string, nextDriverId: string) {
    const booking = await this.requireBooking(bookingId);
    if (booking.status !== BookingStatus.pending) {
      throw new BadRequestException('Only pending bookings can be moved to the next driver.');
    }
    if (nextDriverId === booking.driverId) {
      throw new BadRequestException('Pick a different driver.');
    }

    const nextDriver = await prisma.user.findUnique({
      where: { id: nextDriverId },
      select: { id: true, fullName: true, primaryRole: true, roles: { select: { role: true } } },
    });
    if (!nextDriver) throw new NotFoundException('Next driver not found.');
    const hasDriverRole = nextDriver.primaryRole === 'driver' || nextDriver.roles.some((item) => item.role === 'driver');
    if (!hasDriverRole) throw new BadRequestException('Target user is not a driver.');

    await this.ensureNoOverlapForDriver(nextDriver.id, booking.startAt, booking.endAt);

    const groupId = booking.tryNextGroupId ?? booking.id;
    const created = await prisma.$transaction(async (tx) => {
      await tx.driverBooking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.declined },
      });
      return tx.driverBooking.create({
        data: {
          driverId: nextDriver.id,
          renterId: booking.renterId,
          serviceType: booking.serviceType,
          startAt: booking.startAt,
          endAt: booking.endAt,
          pickupAddress: booking.pickupAddress,
          dropoffAddress: booking.dropoffAddress,
          totalAmountRwf: booking.totalAmountRwf,
          notes: booking.notes,
          renterPhone: booking.renterPhone,
          isInstant: false,
          previousBookingId: booking.id,
          tryNextGroupId: groupId,
          status: BookingStatus.pending,
        },
        include: this.bookingInclude(),
      });
    });

    const title = `Driver service (${created.serviceType})`;
    this.notificationsService.queueAdminDeskAlert(
      `Try next: ${title}`,
      `Moved ${booking.renter.fullName} (${booking.renterPhone}) to ${created.driver.fullName}.`,
      bookingDeskRequestEmailHtml(
        title,
        created.renter.fullName,
        created.renterPhone,
        created.startAt,
        created.endAt,
        created.pickupAddress,
        created.notes,
      ),
    );

    return created;
  }

  async listDriverAlternatives(bookingId: string) {
    const booking = await this.requireBooking(bookingId);
    return prisma.driverProfile.findMany({
      where: {
        userId: { not: booking.driverId },
        user: {
          driverBookingsAsDriver: {
            none: {
              status: { in: Array.from(BLOCKING_DRIVER_BOOKING_STATUSES) },
              startAt: { lt: booking.endAt },
              endAt: { gt: booking.startAt },
            },
          },
        },
      },
      select: {
        id: true,
        userId: true,
        primaryCity: true,
        user: { select: { id: true, fullName: true, phone: true } },
      },
      take: 12,
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(authUser: AuthenticatedUser, bookingId: string) {
    const caller = await this.requireUser(authUser.clerkUserId);
    const booking = await this.requireBooking(bookingId);

    const isRenter = booking.renterId === caller.id;
    const isDriver = booking.driverId === caller.id;
    if (!isRenter && !isDriver) {
      throw new ForbiddenException('Only booking participants can cancel.');
    }
    if (booking.status !== BookingStatus.confirmed) {
      throw new BadRequestException('Only confirmed bookings can be cancelled.');
    }

    const status = isRenter ? BookingStatus.cancelled_by_renter : BookingStatus.cancelled_by_owner;
    const cancelled = await prisma.driverBooking.update({
      where: { id: booking.id },
      data: { status },
      include: this.bookingInclude(),
    });

    const msUntilStart = booking.startAt.getTime() - Date.now();
    if (msUntilStart < 24 * 60 * 60 * 1000) {
      await this.trustScoreService.recordEvent({
        userId: caller.id,
        eventType: 'cancel_lt_24h',
        driverBookingId: booking.id,
      });
    }

    return cancelled;
  }

  async markComplete(authUser: AuthenticatedUser, bookingId: string) {
    const caller = await this.requireUser(authUser.clerkUserId);
    const booking = await this.requireBooking(bookingId);

    if (booking.renterId !== caller.id && booking.driverId !== caller.id) {
      throw new ForbiddenException('Only booking participants can mark complete.');
    }
    if (booking.status !== BookingStatus.active) {
      throw new BadRequestException('Booking must be active to mark complete.');
    }

    const updated = await prisma.driverBooking.update({
      where: { id: booking.id },
      data:
        booking.renterId === caller.id
          ? { clientMarkedComplete: true }
          : { driverMarkedComplete: true },
      include: this.bookingInclude(),
    });

    if (updated.clientMarkedComplete && updated.driverMarkedComplete) {
      const completed = await prisma.driverBooking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.completed,
          completedAt: new Date(),
        },
        include: this.bookingInclude(),
      });

      await Promise.all([
        this.trustScoreService.recordEvent({
          userId: completed.driverId,
          eventType: 'booking_complete',
          driverBookingId: completed.id,
        }),
        this.trustScoreService.recordEvent({
          userId: completed.renterId,
          eventType: 'booking_complete',
          driverBookingId: completed.id,
        }),
      ]);

      this.notificationsService.emitInAppToUsers(
        [completed.driverId, completed.renterId],
        realtimeEvents.reviewPrompt,
        {
          booking: completed,
          bookingType: 'driver',
        },
      );
      this.notificationsService.queueSmsToUsers(
        [completed.driverId, completed.renterId],
        'Your booking is complete. Leave a review on Rentingi to keep your trust score growing.',
      );

      return completed;
    }

    const otherPartyId = caller.id === updated.renterId ? updated.driverId : updated.renterId;
    this.notificationsService.emitInAppToUsers(
      [otherPartyId],
      realtimeEvents.bookingMarkCompleteReceived,
      {
        booking: updated,
        bookingType: 'driver',
      },
    );

    return updated;
  }

  async flagIssue(authUser: AuthenticatedUser, bookingId: string, reason?: string) {
    const caller = await this.requireUser(authUser.clerkUserId);
    const booking = await this.requireBooking(bookingId);

    if (booking.renterId !== caller.id && booking.driverId !== caller.id) {
      throw new ForbiddenException('Only booking participants can flag issues.');
    }
    if (booking.status !== BookingStatus.confirmed && booking.status !== BookingStatus.active) {
      throw new BadRequestException('Only active or confirmed bookings can be disputed.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const disputed = await tx.driverBooking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.disputed },
        include: this.bookingInclude(),
      });

      const existingDispute = await tx.dispute.findFirst({
        where: {
          driverBookingId: booking.id,
          status: {
            in: ['open', 'under_review', 'waiting_evidence', 'escalated'],
          },
        },
        select: { id: true },
      });

      if (!existingDispute) {
        await tx.dispute.create({
          data: {
            openedById: caller.id,
            againstUserId: caller.id === booking.renterId ? booking.driverId : booking.renterId,
            driverBookingId: booking.id,
            reason: reason?.trim() || 'Booking issue flagged',
            description: reason?.trim(),
          },
        });
      }

      return { disputed, createdDispute: !existingDispute };
    });

    if (result.createdDispute) {
      this.notificationsService.emitInAppToAdmin(realtimeEvents.disputeOpened, {
        bookingType: 'driver',
        bookingId: result.disputed.id,
        openedById: caller.id,
      });
      this.notificationsService.emitInAppToUsers(
        [result.disputed.driverId, result.disputed.renterId],
        realtimeEvents.disputeOpened,
        {
          bookingType: 'driver',
          bookingId: result.disputed.id,
          openedById: caller.id,
        },
      );
    }

    return result.disputed;
  }

  async getById(authUser: AuthenticatedUser, bookingId: string) {
    const caller = await this.requireUser(authUser.clerkUserId);
    const booking = await this.requireBooking(bookingId);

    if (booking.renterId !== caller.id && booking.driverId !== caller.id) {
      throw new ForbiddenException('You can only view your own bookings.');
    }

    return this.presentBooking(booking);
  }

  async getMine(authUser: AuthenticatedUser) {
    const caller = await this.requireUser(authUser.clerkUserId);
    await this.promoteEligibleConfirmedBookingsToActive(caller.id);

    const bookings = await prisma.driverBooking.findMany({
      where: {
        OR: [{ renterId: caller.id }, { driverId: caller.id }],
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: this.bookingInclude(),
    });

    return bookings.map((booking) => this.presentBooking(booking));
  }

  async autoCancelStalePendingBookings(_now: Date = new Date()) {
    return;
  }

  async autoCompleteExpiredActiveBookings(now: Date = new Date()) {
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const staleActiveBookings = await prisma.driverBooking.findMany({
      where: {
        status: BookingStatus.active,
        endAt: { lte: fortyEightHoursAgo },
        disputes: {
          none: {
            status: { in: [...ACTIVE_DISPUTE_STATUSES] },
          },
        },
      },
      select: {
        id: true,
        driverId: true,
        renterId: true,
        driver: { select: { fullName: true } },
        renter: { select: { fullName: true } },
      },
    });

    for (const booking of staleActiveBookings) {
      const updated = await prisma.driverBooking.updateMany({
        where: {
          id: booking.id,
          status: BookingStatus.active,
        },
        data: {
          status: BookingStatus.auto_completed,
          completedAt: now,
        },
      });

      if (updated.count === 0) {
        continue;
      }

      await Promise.all([
        this.trustScoreService.recordEvent({
          userId: booking.driverId,
          eventType: 'booking_complete',
          driverBookingId: booking.id,
        }),
        this.trustScoreService.recordEvent({
          userId: booking.renterId,
          eventType: 'booking_complete',
          driverBookingId: booking.id,
        }),
      ]);

      this.notificationsService.emitInAppToUsers(
        [booking.driverId, booking.renterId],
        realtimeEvents.reviewPrompt,
        {
          bookingId: booking.id,
          bookingType: 'driver',
          autoCompleted: true,
        },
      );
      this.notificationsService.queueSmsToUsers(
        [booking.driverId, booking.renterId],
        'Your Rentingi driver booking was auto-completed. Please leave a review.',
      );
      this.notificationsService.queueEmailToUsers(
        [booking.driverId, booking.renterId],
        'Trip completed — renting.rw',
        'Your driver booking has been completed. Thank you for using renting.rw!',
        bookingCompletedEmailHtml(booking.renter.fullName, `Driver: ${booking.driver.fullName}`),
      );
    }
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

  private async requireBooking(bookingId: string) {
    let booking = await prisma.driverBooking.findUnique({
      where: { id: bookingId },
      include: this.bookingInclude(),
    });

    if (!booking) {
      throw new NotFoundException('Driver booking not found.');
    }

    if (booking.status === BookingStatus.confirmed && booking.startAt <= new Date()) {
      const promoted = await prisma.driverBooking.updateMany({
        where: {
          id: booking.id,
          status: BookingStatus.confirmed,
          startAt: { lte: new Date() },
        },
        data: { status: BookingStatus.active },
      });

      if (promoted.count > 0) {
        const refreshed = await prisma.driverBooking.findUnique({
          where: { id: booking.id },
          include: this.bookingInclude(),
        });
        if (refreshed) {
          booking = refreshed;
        }
      }
    }

    return booking;
  }

  private async ensureNoOverlapForDriver(driverId: string, startAt: Date, endAt: Date) {
    const conflict = await prisma.driverBooking.findFirst({
      where: {
        driverId,
        status: {
          in: Array.from(BLOCKING_DRIVER_BOOKING_STATUSES),
        },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: {
        id: true,
      },
    });

    if (conflict) {
      throw new BadRequestException('Driver is not available for the requested slot.');
    }
  }

  private bookingInclude() {
    return {
      driver: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          phone: true,
          whatsapp: true,
        },
      },
      renter: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          phone: true,
        },
      },
      disputes: {
        select: {
          id: true,
          status: true,
          reason: true,
        },
      },
    } satisfies Prisma.DriverBookingInclude;
  }

  private contactRevealed(status: BookingStatus) {
    return (
      status === BookingStatus.confirmed ||
      status === BookingStatus.active ||
      status === BookingStatus.completed ||
      status === BookingStatus.auto_completed ||
      status === BookingStatus.disputed
    );
  }

  private presentBooking(booking: Awaited<ReturnType<DriverBookingsService['requireBooking']>>) {
    const revealed = this.contactRevealed(booking.status);
    return {
      ...booking,
      chatEligible: false,
      driver: {
        ...booking.driver,
        phone: revealed ? booking.driver.phone : null,
        whatsapp: revealed ? booking.driver.whatsapp : null,
      },
      renter: {
        ...booking.renter,
        phone: revealed ? booking.renter.phone : null,
      },
    };
  }

  private async notifyDriverConfirmed(booking: {
    renterId: string;
    driverId: string;
    renterPhone: string;
    startAt: Date;
    endAt: Date;
    renter: { fullName: string; phone: string | null };
    driver: { fullName: string; phone: string | null; whatsapp: string | null };
  }) {
    const provider = formatContactLine(booking.driver.fullName, booking.driver.phone, booking.driver.whatsapp);
    this.notificationsService.queueSmsToPhones(
      [booking.renterPhone, booking.renter.phone].filter((value): value is string => Boolean(value)),
      `Your renting.rw driver booking is confirmed. Driver: ${provider}.`,
    );
    this.notificationsService.queueEmailToUsers(
      [booking.renterId],
      'Booking confirmed — renting.rw',
      `Your driver booking is confirmed. ${provider}`,
      bookingConfirmedEmailHtml(
        booking.renter.fullName,
        `Driver: ${booking.driver.fullName}`,
        booking.startAt,
        booking.endAt,
        provider,
      ),
    );
    this.notificationsService.queueSmsToUsers(
      [booking.driverId],
      `A renting.rw booking is confirmed. Client phone: ${booking.renterPhone}.`,
    );
  }

  private async promoteEligibleConfirmedBookingsToActive(userId: string) {
    await prisma.driverBooking.updateMany({
      where: {
        status: BookingStatus.confirmed,
        startAt: { lte: new Date() },
        OR: [{ renterId: userId }, { driverId: userId }],
      },
      data: { status: BookingStatus.active },
    });
  }
}
