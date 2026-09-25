import { Injectable } from '@nestjs/common';
import { Prisma, TrustEventType, UserStatus } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { prisma } from '../database/prisma';
import { realtimeEvents } from '../realtime/realtime.events';
import type { ResolvedTrustEvent, TrustDeltaEventType, TrustEventInput } from './trust-score.types';

const TRUST_SCORE_SUSPEND_THRESHOLD = 60;

const TRUST_EVENT_DELTAS: Record<TrustDeltaEventType, number> = {
  booking_complete: 2,
  review_left: 1,
  five_star_received: 1,
  on_time: 0.5,
  no_show: -10,
  late_pickup: -5,
  not_as_described: -8,
  damage: -10,
  no_response_1h: -5,
  cancel_lt_24h: -2,
  booking_rejected: -10,
};

const DAILY_POSITIVE_CAP = 5;
const WEEKLY_POSITIVE_CAP = 15;
const SCORE_MIN = 0;
const SCORE_MAX = 100;

@Injectable()
export class TrustScoreService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async recordEvent(input: TrustEventInput) {
    const resolved = this.resolveEvent(input.eventType, input.reason);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: { id: true, trustScore: true },
      });

      const appliedDelta = await this.capPositiveDelta(tx, input.userId, resolved.delta);
      if (appliedDelta === 0 && resolved.delta > 0) {
        return {
          skipped: true as const,
          user: { id: user.id, trustScore: Number(user.trustScore), status: undefined },
          event: null,
        };
      }

      const nextScore = this.clampScore(new Prisma.Decimal(user.trustScore).plus(appliedDelta));
      const shouldSuspend = nextScore.lessThan(TRUST_SCORE_SUSPEND_THRESHOLD);

      const event = await tx.trustScoreEvent.create({
        data: {
          userId: input.userId,
          type: resolved.type,
          delta: appliedDelta,
          reason: resolved.reason,
          carBookingId: input.carBookingId,
          driverBookingId: input.driverBookingId,
          metadata: {
            eventType: input.eventType,
            rawDelta: resolved.delta,
            appliedDelta,
            ...(input.metadata ?? {}),
          },
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: input.userId },
        data: {
          trustScore: nextScore,
          status: shouldSuspend ? UserStatus.suspended : undefined,
        },
        select: {
          id: true,
          trustScore: true,
          status: true,
        },
      });

      return {
        skipped: false as const,
        event,
        user: {
          ...updatedUser,
          trustScore: Number(updatedUser.trustScore),
        },
      };
    });

    if (result.skipped || !result.event) {
      return result;
    }

    this.notificationsService.emitInAppToUsers([input.userId], realtimeEvents.trustScoreUpdated, {
      userId: result.user.id,
      trustScore: result.user.trustScore,
      status: result.user.status,
      eventType: input.eventType,
      eventId: result.event.id,
    });

    return result;
  }

  async recordManualAdjustment(input: {
    userId: string;
    delta: number;
    reason: string;
    carBookingId?: string;
    driverBookingId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: { id: true, trustScore: true },
      });

      const nextScore = this.clampScore(new Prisma.Decimal(user.trustScore).plus(input.delta));
      const shouldSuspend = nextScore.lessThan(TRUST_SCORE_SUSPEND_THRESHOLD);

      const event = await tx.trustScoreEvent.create({
        data: {
          userId: input.userId,
          type: TrustEventType.admin_adjustment,
          delta: input.delta,
          reason: input.reason,
          carBookingId: input.carBookingId,
          driverBookingId: input.driverBookingId,
          metadata: {
            rawDelta: input.delta,
            ...(input.metadata ?? {}),
          },
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: input.userId },
        data: {
          trustScore: nextScore,
          status: shouldSuspend ? UserStatus.suspended : undefined,
        },
        select: {
          id: true,
          trustScore: true,
          status: true,
        },
      });

      return {
        event,
        user: {
          ...updatedUser,
          trustScore: Number(updatedUser.trustScore),
        },
      };
    });

    this.notificationsService.emitInAppToUsers([input.userId], realtimeEvents.trustScoreUpdated, {
      userId: result.user.id,
      trustScore: result.user.trustScore,
      status: result.user.status,
      eventType: 'admin_adjustment',
      eventId: result.event.id,
    });

    return result;
  }

  async getEventsForUser(userId: string) {
    const events = await prisma.trustScoreEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return events.map((event) => ({
      ...event,
      metadata: event.metadata ?? undefined,
    }));
  }

  async getPublicEvents(userId: string, limit = 12) {
    const events = await prisma.trustScoreEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        delta: true,
        createdAt: true,
      },
    });
    return events.map((event) => ({
      id: event.id,
      type: event.type,
      delta: Number(event.delta),
      createdAt: event.createdAt,
    }));
  }

  private clampScore(value: Prisma.Decimal) {
    if (value.lessThan(SCORE_MIN)) return new Prisma.Decimal(SCORE_MIN);
    if (value.greaterThan(SCORE_MAX)) return new Prisma.Decimal(SCORE_MAX);
    return value;
  }

  private async capPositiveDelta(
    tx: Prisma.TransactionClient,
    userId: string,
    delta: number,
  ): Promise<number> {
    if (delta <= 0) return delta;
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [daySum, weekSum] = await Promise.all([
      tx.trustScoreEvent.aggregate({
        where: { userId, delta: { gt: 0 }, createdAt: { gte: dayStart } },
        _sum: { delta: true },
      }),
      tx.trustScoreEvent.aggregate({
        where: { userId, delta: { gt: 0 }, createdAt: { gte: weekStart } },
        _sum: { delta: true },
      }),
    ]);

    const remainingDay = DAILY_POSITIVE_CAP - Number(daySum._sum.delta ?? 0);
    const remainingWeek = WEEKLY_POSITIVE_CAP - Number(weekSum._sum.delta ?? 0);
    return Math.max(0, Math.min(delta, remainingDay, remainingWeek));
  }

  private resolveEvent(eventType: TrustDeltaEventType, overrideReason?: string): ResolvedTrustEvent {
    const delta = TRUST_EVENT_DELTAS[eventType];
    const defaultReason = `trust_event:${eventType}`;
    const reason = overrideReason?.trim() || defaultReason;
    const mappedType = this.mapEventTypeForStorage(eventType, delta);

    return {
      type: mappedType,
      delta,
      reason,
    };
  }

  private mapEventTypeForStorage(eventType: TrustDeltaEventType, delta: number): TrustEventType {
    if (eventType === 'review_left' || eventType === 'five_star_received') {
      return TrustEventType.review_received;
    }

    if (eventType === 'not_as_described' || eventType === 'damage') {
      return TrustEventType.dispute_resolved;
    }

    if (delta >= 0) {
      return TrustEventType.booking_completed_positive;
    }

    return TrustEventType.booking_cancelled_negative;
  }
}
