import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus, ListingStatus, Prisma, type CarBooking, type User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { NotificationsService } from '../notifications/notifications.service';
import { realtimeEvents } from '../realtime/realtime.events';
import { TrustScoreService } from '../trust-score/trust-score.service';
import type { CreateBookingDto } from './dto/create-booking.dto';
import {
  bookingRequestEmailHtml,
  bookingConfirmedEmailHtml,
  bookingDeclinedEmailHtml,
  bookingAutoCancelledEmailHtml,
  bookingCompletedEmailHtml,
} from '../notifications/email-templates';

const BLOCKING_BOOKING_STATUSES = new Set<BookingStatus>([
  BookingStatus.confirmed,
  BookingStatus.active,
  BookingStatus.disputed,
]);
const ACTIVE_DISPUTE_STATUSES = ['open', 'under_review', 'waiting_evidence', 'escalated'] as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly trustScoreService: TrustScoreService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runBookingLifecycleCron() {
    try {
      await Promise.all([this.autoCancelStalePendingBookings(), this.autoCompleteExpiredActiveBookings()]);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2021') {
        return;
      }
      throw error;
    }
  }

  async create(authUser: AuthenticatedUser, payload: CreateBookingDto) {
    if (payload.startDate >= payload.endDate) {
      throw new BadRequestException('endDate must be after startDate.');
    }

    const renter = await this.requireUser(authUser.clerkUserId);
    const listing = await prisma.carListing.findUnique({
      where: { id: payload.listingId },
      select: {
        id: true,
        ownerId: true,
        status: true,
      },
    });

    if (!listing || listing.status !== ListingStatus.active) {
      throw new NotFoundException('Active listing not found.');
    }

    if (listing.ownerId === renter.id) {
      throw new BadRequestException('You cannot book your own listing.');
    }

    await this.ensureNoOverlapForListing(payload.listingId, payload.startDate, payload.endDate);

    const booking = await prisma.carBooking.create({
      data: {
        listingId: payload.listingId,
        renterId: renter.id,
        ownerId: listing.ownerId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        pickupAddress: payload.pickupAddress,
        totalAmountRwf: payload.totalAmountRwf,
        paymentMethod: payload.paymentMethod,
        notes: payload.notes,
        status: BookingStatus.pending,
      },
      include: this.bookingInclude(),
    });

    this.notificationsService.emitInAppToUsers([booking.ownerId], realtimeEvents.bookingNewRequest, {
      booking,
      bookingType: 'car',
    });
    this.notificationsService.queueSmsToUsers(
      [booking.ownerId],
      'You have a new Rentingi booking request waiting for confirmation.',
    );
    this.notificationsService.queueEmailToUsers(
      [booking.ownerId],
      'New booking request — renting.rw',
      `${booking.renter.fullName} has sent a booking request for ${booking.listing.title}.`,
      bookingRequestEmailHtml(booking.owner.fullName, booking.renter.fullName, booking.listing.title, booking.startDate, booking.endDate),
    );

    return booking;
  }

  async confirm(authUser: AuthenticatedUser, bookingId: string) {
    const caller = await this.requireUser(authUser.clerkUserId);
    const booking = await this.requireBooking(bookingId);

    if (booking.ownerId !== caller.id) {
      throw new ForbiddenException('Only the listing owner can confirm this booking.');
    }
    if (booking.status !== BookingStatus.pending) {
      throw new BadRequestException('Only pending bookings can be confirmed.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const confirmed = await tx.carBooking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.confirmed },
        include: this.bookingInclude(),
      });

      const overlappingBookings = await tx.carBooking.findMany({
        where: {
          id: { not: booking.id },
          listingId: booking.listingId,
          status: BookingStatus.pending,
          startDate: { lt: booking.endDate },
          endDate: { gt: booking.startDate },
        },
        select: { id: true, renterId: true },
      });

      if (overlappingBookings.length > 0) {
        await tx.carBooking.updateMany({
          where: { id: { in: overlappingBookings.map((item) => item.id) } },
          data: {
            status: BookingStatus.overlap_declined,
          },
        });
      }

      return { confirmed, overlappingBookings };
    });

    this.notificationsService.emitInAppToUsers(
      [updated.confirmed.renterId],
      realtimeEvents.bookingConfirmed,
      {
        booking: updated.confirmed,
        bookingType: 'car',
      },
    );
    this.notificationsService.queueSmsToUsers(
      [updated.confirmed.renterId],
      'Your Rentingi booking request was confirmed.',
    );
    this.notificationsService.queueEmailToUsers(
      [updated.confirmed.renterId],
      'Booking confirmed — renting.rw',
      `Your booking for ${updated.confirmed.listing.title} has been confirmed.`,
      bookingConfirmedEmailHtml(updated.confirmed.renter.fullName, updated.confirmed.listing.title, updated.confirmed.startDate, updated.confirmed.endDate),
    );

    if (updated.overlappingBookings.length > 0) {
      this.notificationsService.emitInAppToUsers(
        updated.overlappingBookings.map((item) => item.renterId),
        realtimeEvents.bookingOverlapDeclined,
        {
          confirmedBookingId: updated.confirmed.id,
          bookingType: 'car',
        },
      );
      this.notificationsService.queueSmsToUsers(
        updated.overlappingBookings.map((item) => item.renterId),
        'Your Rentingi booking request was declined because the selected slot is no longer available.',
      );
    }

    return {
      ...updated.confirmed,
      chatEligible: true,
    };
  }

  async decline(authUser: AuthenticatedUser, bookingId: string) {
    const caller = await this.requireUser(authUser.clerkUserId);
    const booking = await this.requireBooking(bookingId);

    if (booking.ownerId !== caller.id) {
      throw new ForbiddenException('Only the listing owner can decline this booking.');
    }
    if (booking.status !== BookingStatus.pending) {
      throw new BadRequestException('Only pending bookings can be declined.');
    }

    const declined = await prisma.carBooking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.declined },
      include: this.bookingInclude(),
    });

    this.notificationsService.emitInAppToUsers([declined.renterId], realtimeEvents.bookingDeclined, {
      booking: declined,
      bookingType: 'car',
    });
    this.notificationsService.queueSmsToUsers(
      [declined.renterId],
      'Your Rentingi booking request was declined.',
    );
    this.notificationsService.queueEmailToUsers(
      [declined.renterId],
      'Booking request declined — renting.rw',
      `Your booking request for ${declined.listing.title} was declined.`,
      bookingDeclinedEmailHtml(declined.renter.fullName, declined.listing.title),
    );

    return declined;
  }

  async cancel(authUser: AuthenticatedUser, bookingId: string) {
    const caller = await this.requireUser(authUser.clerkUserId);
    const booking = await this.requireBooking(bookingId);

    const isRenter = booking.renterId === caller.id;
    const isOwner = booking.ownerId === caller.id;
    if (!isRenter && !isOwner) {
      throw new ForbiddenException('Only booking participants can cancel.');
    }
    if (booking.status !== BookingStatus.confirmed) {
      throw new BadRequestException('Only confirmed bookings can be cancelled.');
    }

    const status = isRenter ? BookingStatus.cancelled_by_renter : BookingStatus.cancelled_by_owner;
    const cancelled = await prisma.carBooking.update({
      where: { id: booking.id },
      data: { status },
      include: this.bookingInclude(),
    });

    const msUntilStart = booking.startDate.getTime() - Date.now();
    if (msUntilStart < 24 * 60 * 60 * 1000) {
      await this.trustScoreService.recordEvent({
        userId: caller.id,
        eventType: 'cancel_lt_24h',
        carBookingId: booking.id,
      });
    }

    return cancelled;
  }

  async markComplete(authUser: AuthenticatedUser, bookingId: string) {
    const caller = await this.requireUser(authUser.clerkUserId);
    const booking = await this.requireBooking(bookingId);

    if (booking.renterId !== caller.id && booking.ownerId !== caller.id) {
      throw new ForbiddenException('Only booking participants can mark complete.');
    }

    if (booking.status !== BookingStatus.active) {
      throw new BadRequestException('Booking must be active to mark complete.');
    }

    const updated = await prisma.carBooking.update({
      where: { id: booking.id },
      data:
        booking.renterId === caller.id
          ? { renterMarkedComplete: true }
          : { ownerMarkedComplete: true },
      include: this.bookingInclude(),
    });

    if (updated.renterMarkedComplete && updated.ownerMarkedComplete) {
      const completed = await prisma.carBooking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.completed,
          completedAt: new Date(),
        },
        include: this.bookingInclude(),
      });

      await Promise.all([
        this.trustScoreService.recordEvent({
          userId: completed.ownerId,
          eventType: 'booking_complete',
          carBookingId: completed.id,
        }),
        this.trustScoreService.recordEvent({
          userId: completed.renterId,
          eventType: 'booking_complete',
          carBookingId: completed.id,
        }),
      ]);

      this.notificationsService.emitInAppToUsers(
        [completed.ownerId, completed.renterId],
        realtimeEvents.reviewPrompt,
        {
          booking: completed,
          bookingType: 'car',
        },
      );
      this.notificationsService.queueSmsToUsers(
        [completed.ownerId, completed.renterId],
        'Your booking is complete. Leave a review on Rentingi to keep your trust score growing.',
      );
      this.notificationsService.queueEmailToUsers(
        [completed.ownerId],
        'Booking completed — renting.rw',
        `Your booking for ${completed.listing.title} has been completed. Leave a review!`,
        bookingCompletedEmailHtml(completed.owner.fullName, completed.listing.title),
      );
      this.notificationsService.queueEmailToUsers(
        [completed.renterId],
        'Booking completed — renting.rw',
        `Your booking for ${completed.listing.title} has been completed. Leave a review!`,
        bookingCompletedEmailHtml(completed.renter.fullName, completed.listing.title),
      );

      return completed;
    }

    const otherPartyId = caller.id === updated.renterId ? updated.ownerId : updated.renterId;
    this.notificationsService.emitInAppToUsers(
      [otherPartyId],
      realtimeEvents.bookingMarkCompleteReceived,
      {
        booking: updated,
        bookingType: 'car',
      },
    );

    return updated;
  }

  async flagIssue(authUser: AuthenticatedUser, bookingId: string, reason?: string) {
    const caller = await this.requireUser(authUser.clerkUserId);
    const booking = await this.requireBooking(bookingId);

    if (booking.renterId !== caller.id && booking.ownerId !== caller.id) {
      throw new ForbiddenException('Only booking participants can flag issues.');
    }
    if (booking.status !== BookingStatus.confirmed && booking.status !== BookingStatus.active) {
      throw new BadRequestException('Only active or confirmed bookings can be disputed.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const disputed = await tx.carBooking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.disputed },
        include: this.bookingInclude(),
      });

      const existingDispute = await tx.dispute.findFirst({
        where: {
          carBookingId: booking.id,
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
            againstUserId: caller.id === booking.renterId ? booking.ownerId : booking.renterId,
            carBookingId: booking.id,
            reason: reason?.trim() || 'Booking issue flagged',
            description: reason?.trim(),
          },
        });
      }

      return { disputed, createdDispute: !existingDispute };
    });

    if (result.createdDispute) {
      this.notificationsService.emitInAppToAdmin(realtimeEvents.disputeOpened, {
        bookingType: 'car',
        bookingId: result.disputed.id,
        openedById: caller.id,
      });
      this.notificationsService.emitInAppToUsers(
        [result.disputed.ownerId, result.disputed.renterId],
        realtimeEvents.disputeOpened,
        {
          bookingType: 'car',
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

    if (booking.renterId !== caller.id && booking.ownerId !== caller.id) {
      throw new ForbiddenException('You can only view your own bookings.');
    }

    return {
      ...booking,
      chatEligible: this.isChatEligibleStatus(booking.status),
    };
  }

  async getMine(authUser: AuthenticatedUser) {
    const caller = await this.requireUser(authUser.clerkUserId);
    await this.promoteEligibleConfirmedBookingsToActive(caller.id);

    const bookings = await prisma.carBooking.findMany({
      where: {
        OR: [{ renterId: caller.id }, { ownerId: caller.id }],
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: this.bookingInclude(),
    });

    return bookings.map((booking) => ({
      ...booking,
      chatEligible: this.isChatEligibleStatus(booking.status),
    }));
  }

  async autoCancelStalePendingBookings(now: Date = new Date()) {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const staleBookings = await prisma.carBooking.findMany({
      where: {
        status: BookingStatus.pending,
        createdAt: { lte: oneHourAgo },
      },
      select: {
        id: true,
        ownerId: true,
        renterId: true,
        owner: { select: { fullName: true } },
        renter: { select: { fullName: true } },
        listing: { select: { title: true } },
      },
    });

    for (const booking of staleBookings) {
      const updated = await prisma.carBooking.updateMany({
        where: {
          id: booking.id,
          status: BookingStatus.pending,
        },
        data: {
          status: BookingStatus.auto_cancelled,
        },
      });

      if (updated.count === 0) {
        continue;
      }

      await this.trustScoreService.recordEvent({
        userId: booking.ownerId,
        eventType: 'no_response_1h',
        carBookingId: booking.id,
      });

      this.notificationsService.emitInAppToUsers(
        [booking.ownerId, booking.renterId],
        realtimeEvents.bookingAutoCancelled,
        {
          bookingId: booking.id,
          bookingType: 'car',
        },
      );
      this.notificationsService.queueSmsToUsers(
        [booking.ownerId, booking.renterId],
        'A Rentingi booking request was auto-cancelled due to no response within 1 hour.',
      );
      this.notificationsService.queueEmailToUsers(
        [booking.ownerId],
        'Booking auto-cancelled — renting.rw',
        `A booking request for ${booking.listing.title} was auto-cancelled because you did not respond within 1 hour.`,
        bookingAutoCancelledEmailHtml(booking.owner.fullName, booking.listing.title),
      );
      this.notificationsService.queueEmailToUsers(
        [booking.renterId],
        'Booking auto-cancelled — renting.rw',
        `Your booking request for ${booking.listing.title} was auto-cancelled due to no response.`,
        bookingAutoCancelledEmailHtml(booking.renter.fullName, booking.listing.title),
      );
    }
  }

  async autoCompleteExpiredActiveBookings(now: Date = new Date()) {
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const staleActiveBookings = await prisma.carBooking.findMany({
      where: {
        status: BookingStatus.active,
        endDate: { lte: fortyEightHoursAgo },
        disputes: {
          none: {
            status: { in: [...ACTIVE_DISPUTE_STATUSES] },
          },
        },
      },
      select: {
        id: true,
        ownerId: true,
        renterId: true,
        owner: { select: { fullName: true } },
        renter: { select: { fullName: true } },
        listing: { select: { title: true } },
      },
    });

    for (const booking of staleActiveBookings) {
      const updated = await prisma.carBooking.updateMany({
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
          userId: booking.ownerId,
          eventType: 'booking_complete',
          carBookingId: booking.id,
        }),
        this.trustScoreService.recordEvent({
          userId: booking.renterId,
          eventType: 'booking_complete',
          carBookingId: booking.id,
        }),
      ]);

      this.notificationsService.emitInAppToUsers(
        [booking.ownerId, booking.renterId],
        realtimeEvents.reviewPrompt,
        {
          bookingId: booking.id,
          bookingType: 'car',
          autoCompleted: true,
        },
      );
      this.notificationsService.queueSmsToUsers(
        [booking.ownerId, booking.renterId],
        'Your Rentingi booking was auto-completed. Please leave a review.',
      );
      this.notificationsService.queueEmailToUsers(
        [booking.ownerId],
        'Booking completed — renting.rw',
        `Your booking for ${booking.listing.title} has been completed. Leave a review!`,
        bookingCompletedEmailHtml(booking.owner.fullName, booking.listing.title),
      );
      this.notificationsService.queueEmailToUsers(
        [booking.renterId],
        'Booking completed — renting.rw',
        `Your booking for ${booking.listing.title} has been completed. Leave a review!`,
        bookingCompletedEmailHtml(booking.renter.fullName, booking.listing.title),
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
    let booking = await prisma.carBooking.findUnique({
      where: { id: bookingId },
      include: this.bookingInclude(),
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (booking.status === BookingStatus.confirmed && booking.startDate <= new Date()) {
      const promoted = await prisma.carBooking.updateMany({
        where: {
          id: booking.id,
          status: BookingStatus.confirmed,
          startDate: { lte: new Date() },
        },
        data: { status: BookingStatus.active },
      });

      if (promoted.count > 0) {
        const refreshed = await prisma.carBooking.findUnique({
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

  private async ensureNoOverlapForListing(listingId: string, startDate: Date, endDate: Date) {
    const conflict = await prisma.carBooking.findFirst({
      where: {
        listingId,
        status: {
          in: Array.from(BLOCKING_BOOKING_STATUSES),
        },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      select: {
        id: true,
      },
    });

    if (conflict) {
      throw new BadRequestException('This listing is not available for the requested slot.');
    }
  }

  private bookingInclude() {
    return {
      listing: {
        select: {
          id: true,
          title: true,
          photos: true,
        },
      },
      owner: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      renter: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      disputes: {
        select: {
          id: true,
          status: true,
          reason: true,
        },
      },
    } satisfies Prisma.CarBookingInclude;
  }

  private bookingIncludeFull() {
    return {
      ...this.bookingInclude(),
      owner: { select: { id: true, fullName: true, avatarUrl: true } },
      renter: { select: { id: true, fullName: true, avatarUrl: true } },
    } satisfies Prisma.CarBookingInclude;
  }

  private isChatEligibleStatus(status: CarBooking['status']) {
    return (
      status === BookingStatus.confirmed ||
      status === BookingStatus.active ||
      status === BookingStatus.completed ||
      status === BookingStatus.auto_completed
    );
  }

  private async promoteEligibleConfirmedBookingsToActive(userId: string) {
    await prisma.carBooking.updateMany({
      where: {
        status: BookingStatus.confirmed,
        startDate: { lte: new Date() },
        OR: [{ renterId: userId }, { ownerId: userId }],
      },
      data: { status: BookingStatus.active },
    });
  }
}
