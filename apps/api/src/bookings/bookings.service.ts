import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus, ListingStatus, Prisma, type User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { NotificationsService } from '../notifications/notifications.service';
import { realtimeEvents } from '../realtime/realtime.events';
import { TrustScoreService } from '../trust-score/trust-score.service';
import type { CreateBookingDto } from './dto/create-booking.dto';
import {
  hosterHasInstantBooking,
  maybeStoreRenterPhone,
  normalizeBookingPhone,
  formatContactLine,
} from './booking-desk.util';
import {
  bookingSubmittedEmailHtml,
  bookingConfirmedEmailHtml,
  bookingDeclinedEmailHtml,
  bookingCompletedEmailHtml,
  bookingDeskRequestEmailHtml,
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

    const renterPhone = normalizeBookingPhone(payload.renterPhone);
    await maybeStoreRenterPhone(renter.id, renterPhone);
    const isInstant = await hosterHasInstantBooking(listing.ownerId);

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
        renterPhone,
        isInstant,
        status: isInstant ? BookingStatus.confirmed : BookingStatus.pending,
      },
      include: this.bookingInclude(),
    });

    if (isInstant) {
      await this.notifyCarConfirmed(booking);
      return {
        ...booking,
        fulfillment: 'instant' as const,
        providerContact: {
          name: booking.owner.fullName,
          phone: booking.owner.phone,
          whatsapp: booking.owner.whatsapp,
        },
      };
    }

    this.notificationsService.queueAdminDeskAlert(
      `Booking desk: ${booking.listing.title}`,
      `${booking.renter.fullName} (${renterPhone}) requested ${booking.listing.title}. Pickup ${booking.pickupAddress}.`,
      bookingDeskRequestEmailHtml(
        booking.listing.title,
        booking.renter.fullName,
        renterPhone,
        booking.startDate,
        booking.endDate,
        booking.pickupAddress,
        booking.notes,
      ),
    );
    this.notificationsService.queueEmailToUsers(
      [booking.renterId],
      'Booking request submitted — renting.rw',
      `Your booking request for ${booking.listing.title} was sent to the renting.rw desk.`,
      bookingSubmittedEmailHtml(booking.renter.fullName, booking.listing.title, booking.startDate, booking.endDate),
    );
    this.notificationsService.queueSmsToPhones(
      [renterPhone],
      'Your renting.rw request was sent. We will confirm and share the provider contact.',
    );

    return {
      ...booking,
      fulfillment: 'admin_desk' as const,
      providerContact: null,
    };
  }

  async confirm(_authUser: AuthenticatedUser, _bookingId: string) {
    throw new ForbiddenException('Standard bookings are confirmed by the renting.rw desk.');
  }

  async confirmByAdmin(bookingId: string) {
    const booking = await this.requireBooking(bookingId);
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
        select: { id: true, renterId: true, renterPhone: true },
      });

      if (overlappingBookings.length > 0) {
        await tx.carBooking.updateMany({
          where: { id: { in: overlappingBookings.map((item) => item.id) } },
          data: { status: BookingStatus.overlap_declined },
        });
      }

      return { confirmed, overlappingBookings };
    });

    await this.notifyCarConfirmed(updated.confirmed);

    if (updated.overlappingBookings.length > 0) {
      this.notificationsService.queueSmsToUsers(
        updated.overlappingBookings.map((item) => item.renterId),
        'Your renting.rw request was declined because that slot is no longer available.',
      );
    }

    return updated.confirmed;
  }

  async decline(_authUser: AuthenticatedUser, _bookingId: string) {
    throw new ForbiddenException('Standard bookings are declined by the renting.rw desk.');
  }

  async rejectByAdmin(bookingId: string) {
    const booking = await this.requireBooking(bookingId);
    if (booking.status !== BookingStatus.pending) {
      throw new BadRequestException('Only pending bookings can be declined.');
    }

    const declined = await prisma.carBooking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.declined },
      include: this.bookingInclude(),
    });

    this.notificationsService.queueSmsToPhones(
      [declined.renterPhone].filter(Boolean),
      'Your renting.rw booking request was declined. You can request another listing.',
    );
    this.notificationsService.queueEmailToUsers(
      [declined.renterId],
      'Booking request declined — renting.rw',
      `Your booking request for ${declined.listing.title} was declined.`,
      bookingDeclinedEmailHtml(declined.renter.fullName, declined.listing.title),
    );

    void this.trustScoreService.recordEvent({
      userId: declined.ownerId,
      eventType: 'booking_rejected',
      carBookingId: declined.id,
      reason: 'Pending booking rejected by the renting.rw desk',
    });

    return declined;
  }

  async tryNextByAdmin(bookingId: string, nextListingId: string) {
    const booking = await this.requireBooking(bookingId);
    if (booking.status !== BookingStatus.pending) {
      throw new BadRequestException('Only pending bookings can be moved to the next listing.');
    }
    if (nextListingId === booking.listingId) {
      throw new BadRequestException('Pick a different listing.');
    }

    const nextListing = await prisma.carListing.findUnique({
      where: { id: nextListingId },
      select: { id: true, ownerId: true, status: true, title: true },
    });
    if (!nextListing || nextListing.status !== ListingStatus.active) {
      throw new NotFoundException('Next listing not found.');
    }

    await this.ensureNoOverlapForListing(nextListing.id, booking.startDate, booking.endDate);

    const groupId = booking.tryNextGroupId ?? booking.id;
    const created = await prisma.$transaction(async (tx) => {
      await tx.carBooking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.declined },
      });
      return tx.carBooking.create({
        data: {
          listingId: nextListing.id,
          renterId: booking.renterId,
          ownerId: nextListing.ownerId,
          startDate: booking.startDate,
          endDate: booking.endDate,
          pickupAddress: booking.pickupAddress,
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

    this.notificationsService.queueAdminDeskAlert(
      `Try next: ${created.listing.title}`,
      `Moved ${booking.renter.fullName} (${booking.renterPhone}) from ${booking.listing.title} to ${created.listing.title}.`,
      bookingDeskRequestEmailHtml(
        created.listing.title,
        created.renter.fullName,
        created.renterPhone,
        created.startDate,
        created.endDate,
        created.pickupAddress,
        created.notes,
      ),
    );

    return created;
  }

  async listCarAlternatives(bookingId: string) {
    const booking = await this.requireBooking(bookingId);
    return prisma.carListing.findMany({
      where: {
        status: ListingStatus.active,
        id: { not: booking.listingId },
        bookings: {
          none: {
            status: { in: Array.from(BLOCKING_BOOKING_STATUSES) },
            startDate: { lt: booking.endDate },
            endDate: { gt: booking.startDate },
          },
        },
      },
      select: {
        id: true,
        title: true,
        locationText: true,
        vehicleType: true,
        owner: { select: { id: true, fullName: true, phone: true } },
      },
      take: 12,
      orderBy: { createdAt: 'desc' },
    });
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

    return this.presentBooking(booking);
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

    return bookings.map((booking) => this.presentBooking(booking));
  }

  async autoCancelStalePendingBookings(_now: Date = new Date()) {
    return;
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
    } satisfies Prisma.CarBookingInclude;
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

  private presentBooking(booking: Awaited<ReturnType<BookingsService['requireBooking']>>) {
    const revealed = this.contactRevealed(booking.status);
    return {
      ...booking,
      chatEligible: false,
      owner: {
        ...booking.owner,
        phone: revealed ? booking.owner.phone : null,
        whatsapp: revealed ? booking.owner.whatsapp : null,
      },
      renter: {
        ...booking.renter,
        phone: revealed ? booking.renter.phone : null,
      },
    };
  }

  private async notifyCarConfirmed(booking: Awaited<ReturnType<BookingsService['requireBooking']>>) {
    const provider = formatContactLine(booking.owner.fullName, booking.owner.phone, booking.owner.whatsapp);
    this.notificationsService.queueSmsToPhones(
      [booking.renterPhone, booking.renter.phone].filter((value): value is string => Boolean(value)),
      `Your renting.rw booking is confirmed. Provider: ${provider}.`,
    );
    this.notificationsService.queueEmailToUsers(
      [booking.renterId],
      'Booking confirmed — renting.rw',
      `Your booking for ${booking.listing.title} is confirmed. ${provider}`,
      bookingConfirmedEmailHtml(
        booking.renter.fullName,
        booking.listing.title,
        booking.startDate,
        booking.endDate,
        provider,
      ),
    );
    this.notificationsService.queueSmsToUsers(
      [booking.ownerId],
      `A renting.rw booking is confirmed. Client phone: ${booking.renterPhone}.`,
    );
    this.notificationsService.queueEmailToUsers(
      [booking.ownerId],
      'Booking confirmed — renting.rw',
      `${booking.renter.fullName} is confirmed for ${booking.listing.title}. Client phone: ${booking.renterPhone}.`,
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
