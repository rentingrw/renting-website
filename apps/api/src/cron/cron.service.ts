import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingStatus, DisputeStatus, ListingStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { prisma } from '../database/prisma';
import { NotificationsService } from '../notifications/notifications.service';
import { realtimeEvents } from '../realtime/realtime.events';
import { TrustScoreService } from '../trust-score/trust-score.service';
import {
  subscriptionRenewalReminderEmailHtml,
  subscriptionExpiredEmailHtml,
} from '../notifications/email-templates';

const CRON_INTERVAL_MINUTES = 5;

const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = [
  DisputeStatus.open,
  DisputeStatus.under_review,
  DisputeStatus.waiting_evidence,
  DisputeStatus.escalated,
];

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly trustScoreService: TrustScoreService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Job 1 — Booking Auto-Cancel (1-hour window)
   * Pending bookings with no response after 1 hour are auto-cancelled.
   * Owner/driver loses -2 trust points; both parties receive notifications.
   */
  @Cron(`*/${CRON_INTERVAL_MINUTES} * * * *`)
  async runBookingAutoCancel() {
    this.logger.debug('Running booking auto-cancel job');

    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const [expiredCarBookings, expiredDriverBookings] = await Promise.all([
        prisma.carBooking.findMany({
        where: {
          status: BookingStatus.pending,
          createdAt: { lt: oneHourAgo },
        },
        select: {
          id: true,
          ownerId: true,
          renterId: true,
        },
      }),
        prisma.driverBooking.findMany({
          where: {
            status: BookingStatus.pending,
            createdAt: { lt: oneHourAgo },
          },
          select: {
            id: true,
            driverId: true,
            renterId: true,
          },
        }),
      ]);

      for (const booking of expiredCarBookings) {
        await this.autoCancelCarBooking(booking);
      }

      for (const booking of expiredDriverBookings) {
        await this.autoCancelDriverBooking(booking);
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2021') {
        this.logger.warn('Cron skipped: database tables not yet migrated. Run: pnpm --filter @rentingi/db migrate');
      } else {
        throw error;
      }
    }
  }

  /**
   * Job 2 — Booking Auto-Complete (48h after end)
   * Active bookings with no open dispute are auto-completed 48h after end time.
   * Both parties receive +2 trust points and review prompts.
   */
  @Cron(`*/${CRON_INTERVAL_MINUTES} * * * *`)
  async runBookingAutoComplete() {
    this.logger.debug('Running booking auto-complete job');

    try {
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const [eligibleCarBookings, eligibleDriverBookings] = await Promise.all([
        prisma.carBooking.findMany({
        where: {
          status: BookingStatus.active,
          endDate: { lt: fortyEightHoursAgo },
          disputes: {
            none: {
              status: { in: ACTIVE_DISPUTE_STATUSES },
            },
          },
        },
        select: {
          id: true,
          ownerId: true,
          renterId: true,
        },
      }),
        prisma.driverBooking.findMany({
          where: {
            status: BookingStatus.active,
            endAt: { lt: fortyEightHoursAgo },
            disputes: {
              none: {
                status: { in: ACTIVE_DISPUTE_STATUSES },
              },
            },
          },
          select: {
            id: true,
            driverId: true,
            renterId: true,
          },
        }),
      ]);

      for (const booking of eligibleCarBookings) {
        await this.autoCompleteCarBooking(booking);
      }

      for (const booking of eligibleDriverBookings) {
        await this.autoCompleteDriverBooking(booking);
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2021') {
        this.logger.warn('Cron skipped: database tables not yet migrated. Run: pnpm --filter @rentingi/db migrate');
      } else {
        throw error;
      }
    }
  }

  /**
   * Subscription reminders and expiry live in SubscriptionsService.
   */
  @Cron(`*/${CRON_INTERVAL_MINUTES} * * * *`)
  async runSubscriptionRenewal() {
    return;
  }

  private async autoCancelCarBooking(booking: {
    id: string;
    ownerId: string;
    renterId: string;
  }) {
    try {
      await prisma.carBooking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.auto_cancelled },
      });

      await this.trustScoreService.recordEvent({
        userId: booking.ownerId,
        eventType: 'no_response_1h',
        reason: `Auto-cancelled car booking ${booking.id} — no response within 1 hour`,
        carBookingId: booking.id,
      });

      const payload = {
        bookingId: booking.id,
        bookingType: 'car' as const,
        status: BookingStatus.auto_cancelled,
      };

      this.notificationsService.emitInAppToUsers(
        [booking.ownerId, booking.renterId],
        realtimeEvents.bookingAutoCancelled,
        payload,
      );

      const smsMessage =
        'Your Rentingi booking was auto-cancelled due to no response within 1 hour.';
      this.notificationsService.queueSmsToUsers(
        [booking.ownerId, booking.renterId],
        smsMessage,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to auto-cancel car booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async autoCancelDriverBooking(booking: {
    id: string;
    driverId: string;
    renterId: string;
  }) {
    try {
      await prisma.driverBooking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.auto_cancelled },
      });

      await this.trustScoreService.recordEvent({
        userId: booking.driverId,
        eventType: 'no_response_1h',
        reason: `Auto-cancelled driver booking ${booking.id} — no response within 1 hour`,
        driverBookingId: booking.id,
      });

      const payload = {
        bookingId: booking.id,
        bookingType: 'driver' as const,
        status: BookingStatus.auto_cancelled,
      };

      this.notificationsService.emitInAppToUsers(
        [booking.driverId, booking.renterId],
        realtimeEvents.bookingAutoCancelled,
        payload,
      );

      const smsMessage =
        'Your Rentingi booking was auto-cancelled due to no response within 1 hour.';
      this.notificationsService.queueSmsToUsers(
        [booking.driverId, booking.renterId],
        smsMessage,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to auto-cancel driver booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async autoCompleteCarBooking(booking: {
    id: string;
    ownerId: string;
    renterId: string;
  }) {
    try {
      await prisma.carBooking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.auto_completed,
          completedAt: new Date(),
        },
      });

      await this.trustScoreService.recordEvent({
        userId: booking.ownerId,
        eventType: 'booking_complete',
        reason: `Auto-completed car booking ${booking.id}`,
        carBookingId: booking.id,
      });

      await this.trustScoreService.recordEvent({
        userId: booking.renterId,
        eventType: 'booking_complete',
        reason: `Auto-completed car booking ${booking.id}`,
        carBookingId: booking.id,
      });

      const payload = {
        bookingId: booking.id,
        bookingType: 'car' as const,
        status: BookingStatus.auto_completed,
      };

      this.notificationsService.emitInAppToUsers(
        [booking.ownerId, booking.renterId],
        realtimeEvents.reviewPrompt,
        payload,
      );

      const smsMessage =
        'Your Rentingi booking has been completed. Please leave a review to help the community.';
      this.notificationsService.queueSmsToUsers(
        [booking.ownerId, booking.renterId],
        smsMessage,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to auto-complete car booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async autoCompleteDriverBooking(booking: {
    id: string;
    driverId: string;
    renterId: string;
  }) {
    try {
      await prisma.driverBooking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.auto_completed,
          completedAt: new Date(),
        },
      });

      await this.trustScoreService.recordEvent({
        userId: booking.driverId,
        eventType: 'booking_complete',
        reason: `Auto-completed driver booking ${booking.id}`,
        driverBookingId: booking.id,
      });

      await this.trustScoreService.recordEvent({
        userId: booking.renterId,
        eventType: 'booking_complete',
        reason: `Auto-completed driver booking ${booking.id}`,
        driverBookingId: booking.id,
      });

      const payload = {
        bookingId: booking.id,
        bookingType: 'driver' as const,
        status: BookingStatus.auto_completed,
      };

      this.notificationsService.emitInAppToUsers(
        [booking.driverId, booking.renterId],
        realtimeEvents.reviewPrompt,
        payload,
      );

      const smsMessage =
        'Your Rentingi booking has been completed. Please leave a review to help the community.';
      this.notificationsService.queueSmsToUsers(
        [booking.driverId, booking.renterId],
        smsMessage,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to auto-complete driver booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async sendRenewalReminder(sub: {
    id: string;
    userId: string;
    renewsAt: Date | null;
    tier: string;
  }) {
    const renewsAt = sub.renewsAt!;
    const dateStr = renewsAt.toLocaleDateString('en-RW');

    try {
      const smsMessage = `Your Rentingi ${sub.tier} subscription renews on ${dateStr}. Renew to keep your listings active.`;
      this.notificationsService.queueSmsToUsers([sub.userId], smsMessage);

      this.notificationsService.queueEmailToUsers(
        [sub.userId],
        'Rentingi subscription renewal reminder',
        `Hi, your ${sub.tier} subscription is set to renew on ${dateStr}. Please ensure your payment method is ready to avoid any interruption to your listings.`,
        subscriptionRenewalReminderEmailHtml('there', sub.tier, dateStr),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send renewal reminder for subscription ${sub.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async expireSubscription(sub: {
    id: string;
    userId: string;
    tier: string;
  }) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.expired },
        });

        await tx.carListing.updateMany({
          where: {
            ownerId: sub.userId,
            status: ListingStatus.active,
          },
          data: { status: ListingStatus.paused },
        });
      });

      const smsMessage =
        'Your Rentingi subscription has expired. Your listings have been paused. Renew to reactivate them.';
      this.notificationsService.queueSmsToUsers([sub.userId], smsMessage);

      this.notificationsService.queueEmailToUsers(
        [sub.userId],
        'Rentingi subscription expired',
        `Your ${sub.tier} subscription has expired. All your active car listings have been paused. Renew your subscription to reactivate them.`,
        subscriptionExpiredEmailHtml('there', sub.tier),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to expire subscription ${sub.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
