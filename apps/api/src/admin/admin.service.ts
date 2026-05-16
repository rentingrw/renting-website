import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BookingStatus,
  DisputeStatus,
  DriverCategory,
  Language,
  ListingStatus,
  Prisma,
  RoleType,
  SubscriptionStatus,
  UserStatus,
  VehicleType,
} from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

import { prisma } from '../database/prisma';
import { DisputesService } from '../disputes/disputes.service';
import { NotificationsService } from '../notifications/notifications.service';
import { realtimeEvents } from '../realtime/realtime.events';
import { TrustScoreService } from '../trust-score/trust-score.service';
import type { ResolveDisputeDto } from '../disputes/dto/resolve-dispute.dto';
import type { DismissDisputeDto } from '../disputes/dto/dismiss-dispute.dto';
import type { AdjustTrustScoreDto } from './dto/adjust-trust-score.dto';
import type { AdminNoteDto } from './dto/admin-note.dto';
import { AdminBookingType, type ListBookingsQueryDto } from './dto/list-bookings.query.dto';
import type { ListDisputesQueryDto } from './dto/list-disputes.query.dto';
import type { ListSubscriptionsQueryDto } from './dto/list-subscriptions.query.dto';
import { TrustTierFilter, type ListUsersQueryDto } from './dto/list-users.query.dto';
import type { ListListingsQueryDto } from './dto/list-listings.query.dto';
import type { RejectListingDto } from './dto/reject-listing.dto';
import type { ListDriversQueryDto } from './dto/list-drivers.query.dto';
import type { AdminCreateCarDto } from './dto/admin-create-car.dto';
import type { AdminCreateDriverDto } from './dto/admin-create-driver.dto';

const OPEN_DISPUTE_STATUSES: DisputeStatus[] = [
  DisputeStatus.open,
  DisputeStatus.under_review,
  DisputeStatus.waiting_evidence,
  DisputeStatus.escalated,
];

const BOOKING_FINAL_STATUSES = new Set<BookingStatus>([
  BookingStatus.completed,
  BookingStatus.auto_completed,
  BookingStatus.cancelled_admin,
  BookingStatus.cancelled_by_owner,
  BookingStatus.cancelled_by_renter,
  BookingStatus.declined,
  BookingStatus.overlap_declined,
  BookingStatus.auto_cancelled,
]);

@Injectable()
export class AdminService {
  constructor(
    private readonly trustScoreService: TrustScoreService,
    private readonly disputesService: DisputesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getOverview() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [
      totalUsers,
      usersByRole,
      openDisputesCount,
      openDisputes,
      carActiveToday,
      driverActiveToday,
      subscriptionRevenueAggregate,
      trustScores,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['primaryRole'],
        _count: { _all: true },
      }),
      prisma.dispute.count({
        where: { status: { in: OPEN_DISPUTE_STATUSES } },
      }),
      prisma.dispute.findMany({
        where: { status: { in: OPEN_DISPUTE_STATUSES } },
        include: {
          openedBy: { select: { id: true, fullName: true } },
          againstUser: { select: { id: true, fullName: true } },
          carBooking: { select: { id: true } },
          driverBooking: { select: { id: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
      prisma.carBooking.count({
        where: {
          status: { in: [BookingStatus.confirmed, BookingStatus.active, BookingStatus.disputed] },
          startDate: { lt: todayEnd },
          endDate: { gte: todayStart },
        },
      }),
      prisma.driverBooking.count({
        where: {
          status: { in: [BookingStatus.confirmed, BookingStatus.active, BookingStatus.disputed] },
          startAt: { lt: todayEnd },
          endAt: { gte: todayStart },
        },
      }),
      prisma.subscription.aggregate({
        _sum: { amountRwf: true },
        where: {
          status: { in: [SubscriptionStatus.active, SubscriptionStatus.cancelled, SubscriptionStatus.expired] },
          startsAt: { gte: monthStart, lt: monthEnd },
        },
      }),
      prisma.user.findMany({
        select: { trustScore: true },
      }),
    ]);

    return {
      metrics: {
        totalUsers,
        usersByRole: usersByRole.map((item) => ({
          role: item.primaryRole,
          count: item._count._all,
        })),
        activeBookingsToday: carActiveToday + driverActiveToday,
        openDisputes: openDisputesCount,
        monthlySubscriptionRevenueRwf: subscriptionRevenueAggregate._sum.amountRwf ?? 0,
      },
      trustScoreDistribution: this.computeTrustDistribution(
        trustScores.map((item) => Number(item.trustScore)),
      ),
      openDisputes: openDisputes.map((dispute) => ({
        id: dispute.id,
        status: dispute.status,
        priority: this.disputePriority(dispute.status, dispute.createdAt),
        reason: dispute.reason,
        createdAt: dispute.createdAt,
        openedBy: dispute.openedBy,
        againstUser: dispute.againstUser,
        bookingType: dispute.carBookingId ? 'car' : 'driver',
        bookingId: dispute.carBookingId ?? dispute.driverBookingId,
      })),
    };
  }

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const andFilters: Prisma.UserWhereInput[] = [];

    if (query.search?.trim()) {
      const search = query.search.trim();
      andFilters.push({
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.status) {
      andFilters.push({ status: query.status });
    }
    if (query.role) {
      andFilters.push({
        OR: [{ primaryRole: query.role }, { roles: { some: { role: query.role } } }],
      });
    }
    if (query.trustTier) {
      const trustRange = this.trustTierRange(query.trustTier);
      andFilters.push({ trustScore: trustRange });
    }
    const where: Prisma.UserWhereInput = andFilters.length > 0 ? { AND: andFilters } : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          roles: { select: { role: true } },
          _count: {
            select: {
              carBookingsAsOwner: true,
              carBookingsAsRenter: true,
              driverBookingsAsDriver: true,
              driverBookingsAsRenter: true,
              carListings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: users.map((user) => ({
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        status: user.status,
        isVerified: user.isVerified,
        primaryRole: user.primaryRole,
        roles: Array.from(new Set<RoleType>([user.primaryRole, ...user.roles.map((item) => item.role)])),
        trustScore: Number(user.trustScore),
        trustTier: this.deriveTrustTier(Number(user.trustScore)),
        createdAt: user.createdAt,
        bookingCount:
          user._count.carBookingsAsOwner +
          user._count.carBookingsAsRenter +
          user._count.driverBookingsAsDriver +
          user._count.driverBookingsAsRenter,
        listingCount: user._count.carListings,
      })),
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { select: { role: true } },
        carListings: {
          select: { id: true, title: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const [trustEvents, carBookings, driverBookings] = await Promise.all([
      this.trustScoreService.getEventsForUser(user.id),
      prisma.carBooking.findMany({
        where: { OR: [{ ownerId: user.id }, { renterId: user.id }] },
        include: {
          listing: { select: { id: true, title: true } },
          owner: { select: { id: true, fullName: true } },
          renter: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      prisma.driverBooking.findMany({
        where: { OR: [{ driverId: user.id }, { renterId: user.id }] },
        include: {
          driver: { select: { id: true, fullName: true } },
          renter: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);

    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      isVerified: user.isVerified,
      trustScore: Number(user.trustScore),
      trustTier: this.deriveTrustTier(Number(user.trustScore)),
      primaryRole: user.primaryRole,
      roles: Array.from(new Set<RoleType>([user.primaryRole, ...user.roles.map((item) => item.role)])),
      languagePreference: user.languagePreference,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      listings: user.carListings,
      subscriptions: user.subscriptions,
      bookingHistory: {
        car: carBookings,
        driver: driverBookings,
      },
      trustEvents,
    };
  }

  async adjustUserTrustScore(userId: string, payload: AdjustTrustScoreDto) {
    await this.ensureUserExists(userId);
    return this.trustScoreService.recordManualAdjustment({
      userId,
      delta: payload.delta,
      reason: payload.reason,
      metadata: { source: 'admin_dashboard' },
    });
  }

  async suspendUser(userId: string, payload?: AdminNoteDto) {
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.suspended },
      });

      const pausedListings = await tx.carListing.updateMany({
        where: { ownerId: userId, status: 'active' },
        data: { status: 'paused' },
      });

      const activeCarBookings = await tx.carBooking.findMany({
        where: {
          OR: [{ ownerId: userId }, { renterId: userId }],
          status: { in: [BookingStatus.confirmed, BookingStatus.active] },
        },
        select: { id: true, status: true },
      });
      const activeDriverBookings = await tx.driverBooking.findMany({
        where: {
          OR: [{ driverId: userId }, { renterId: userId }],
          status: { in: [BookingStatus.confirmed, BookingStatus.active] },
        },
        select: { id: true, status: true },
      });

      await tx.trustScoreEvent.create({
        data: {
          userId,
          type: 'admin_adjustment',
          delta: 0,
          reason: payload?.reason?.trim() || 'admin_action:user_suspended',
          metadata: {
            action: 'suspend_user',
            activeCarBookings: activeCarBookings.length,
            activeDriverBookings: activeDriverBookings.length,
          },
        },
      });

      return {
        user,
        pausedListings: pausedListings.count,
        flaggedBookings: {
          car: activeCarBookings,
          driver: activeDriverBookings,
        },
        occurredAt: now,
      };
    });

    return {
      userId: result.user.id,
      status: result.user.status,
      pausedListings: result.pausedListings,
      flaggedBookings: result.flaggedBookings,
      occurredAt: result.occurredAt,
    };
  }

  async reinstateUser(userId: string, payload?: AdminNoteDto) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.active },
    });

    await prisma.trustScoreEvent.create({
      data: {
        userId,
        type: 'admin_adjustment',
        delta: 0,
        reason: payload?.reason?.trim() || 'admin_action:user_reinstated',
        metadata: {
          action: 'reinstate_user',
        },
      },
    });

    return {
      userId: updated.id,
      status: updated.status,
    };
  }

  async verifyUserPhone(userId: string) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
      select: { id: true, isVerified: true },
    });

    return updated;
  }

  async listSubscriptions(query: ListSubscriptionsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.SubscriptionWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.tier) {
      where.tier = query.tier;
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: subscriptions.map((subscription) => ({
        ...subscription,
        owner: subscription.user,
      })),
    };
  }

  async getSubscriptionPaymentHistoryForOwner(userId: string) {
    await this.ensureUserExists(userId);
    const payments = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      userId,
      payments,
    };
  }

  async activateSubscription(subscriptionId: string, payload?: AdminNoteDto) {
    const activated = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
      });
      if (!subscription) {
        throw new NotFoundException('Subscription not found.');
      }

      const now = new Date();
      const renewsAt = subscription.renewsAt ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.active,
          startsAt: now,
          renewsAt,
          endsAt: null,
        },
      });

      await tx.subscription.updateMany({
        where: {
          userId: subscription.userId,
          status: SubscriptionStatus.active,
          id: { not: subscription.id },
        },
        data: {
          status: SubscriptionStatus.expired,
          endsAt: now,
        },
      });

      await tx.trustScoreEvent.create({
        data: {
          userId: subscription.userId,
          type: 'admin_adjustment',
          delta: 0,
          reason: payload?.reason?.trim() || 'admin_action:subscription_activated',
          metadata: {
            action: 'activate_subscription',
            subscriptionId: subscription.id,
          },
        },
      });

      return updated;
    });

    this.notificationsService.emitInAppToUsers([activated.userId], realtimeEvents.subscriptionActivated, {
      subscriptionId: activated.id,
      tier: activated.tier,
      renewsAt: activated.renewsAt,
      source: 'admin_action',
    });

    return activated;
  }

  async deactivateSubscription(subscriptionId: string, payload?: AdminNoteDto) {
    const now = new Date();
    const deactivated = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
      });
      if (!subscription) {
        throw new NotFoundException('Subscription not found.');
      }

      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.cancelled,
          endsAt: now,
        },
      });

      await tx.carListing.updateMany({
        where: {
          ownerId: subscription.userId,
          status: 'active',
        },
        data: { status: 'paused' },
      });

      await tx.trustScoreEvent.create({
        data: {
          userId: subscription.userId,
          type: 'admin_adjustment',
          delta: 0,
          reason: payload?.reason?.trim() || 'admin_action:subscription_deactivated',
          metadata: {
            action: 'deactivate_subscription',
            subscriptionId: subscription.id,
          },
        },
      });

      return updated;
    });

    return deactivated;
  }

  async listDisputes(query: ListDisputesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.DisputeWhereInput = {};

    if (query.status) {
      where.status = query.status;
    } else if (query.openOnly ?? true) {
      where.status = { in: OPEN_DISPUTE_STATUSES };
    }

    const [total, disputes] = await Promise.all([
      prisma.dispute.count({ where }),
      prisma.dispute.findMany({
        where,
        include: {
          openedBy: { select: { id: true, fullName: true } },
          againstUser: { select: { id: true, fullName: true } },
          resolvedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: disputes.map((dispute) => ({
        ...dispute,
        priority: this.disputePriority(dispute.status, dispute.createdAt),
      })),
    };
  }

  async getDisputeById(disputeId: string) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        openedBy: { select: { id: true, fullName: true, email: true, phone: true, trustScore: true } },
        againstUser: { select: { id: true, fullName: true, email: true, phone: true, trustScore: true } },
        resolvedBy: { select: { id: true, fullName: true } },
        carBooking: {
          include: {
            listing: { select: { id: true, title: true } },
            owner: { select: { id: true, fullName: true } },
            renter: { select: { id: true, fullName: true } },
          },
        },
        driverBooking: {
          include: {
            driver: { select: { id: true, fullName: true } },
            renter: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found.');
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          ...(dispute.carBookingId ? [{ carBookingId: dispute.carBookingId }] : []),
          ...(dispute.driverBookingId ? [{ driverBookingId: dispute.driverBookingId }] : []),
        ],
      },
      include: {
        sender: { select: { id: true, fullName: true } },
        receiver: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    return {
      ...dispute,
      chatLog: messages,
    };
  }

  async resolveDispute(disputeId: string, payload: ResolveDisputeDto) {
    return this.disputesService.resolveAsAdmin(disputeId, payload);
  }

  async dismissDispute(disputeId: string, payload: DismissDisputeDto) {
    return this.disputesService.dismissAsAdmin(disputeId, payload);
  }

  async listBookings(query: ListBookingsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const type = query.type ?? AdminBookingType.all;

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;
    const textSearch = query.search?.trim();

    const carWhere: Prisma.CarBookingWhereInput = {};
    const driverWhere: Prisma.DriverBookingWhereInput = {};

    if (query.status) {
      carWhere.status = query.status;
      driverWhere.status = query.status;
    }
    if (query.userId) {
      carWhere.OR = [{ ownerId: query.userId }, { renterId: query.userId }];
      driverWhere.OR = [{ driverId: query.userId }, { renterId: query.userId }];
    }
    if (dateFrom || dateTo) {
      carWhere.startDate = {};
      driverWhere.startAt = {};
      if (dateFrom) {
        carWhere.startDate.gte = dateFrom;
        driverWhere.startAt.gte = dateFrom;
      }
      if (dateTo) {
        carWhere.startDate.lte = dateTo;
        driverWhere.startAt.lte = dateTo;
      }
    }
    if (textSearch) {
      carWhere.OR = [
        ...(carWhere.OR ?? []),
        { owner: { fullName: { contains: textSearch, mode: 'insensitive' } } },
        { renter: { fullName: { contains: textSearch, mode: 'insensitive' } } },
        { listing: { title: { contains: textSearch, mode: 'insensitive' } } },
      ];
      driverWhere.OR = [
        ...(driverWhere.OR ?? []),
        { driver: { fullName: { contains: textSearch, mode: 'insensitive' } } },
        { renter: { fullName: { contains: textSearch, mode: 'insensitive' } } },
      ];
    }

    const [carBookings, driverBookings] = await Promise.all([
      type === AdminBookingType.driver
        ? Promise.resolve([])
        : prisma.carBooking.findMany({
            where: carWhere,
            include: {
              listing: { select: { id: true, title: true } },
              owner: { select: { id: true, fullName: true } },
              renter: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
          }),
      type === AdminBookingType.car
        ? Promise.resolve([])
        : prisma.driverBooking.findMany({
            where: driverWhere,
            include: {
              driver: { select: { id: true, fullName: true } },
              renter: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
          }),
    ]);

    const merged = [
      ...carBookings.map((booking) => ({
        bookingType: 'car' as const,
        id: booking.id,
        status: booking.status,
        amountRwf: booking.totalAmountRwf,
        startsAt: booking.startDate,
        endsAt: booking.endDate,
        createdAt: booking.createdAt,
        ownerOrDriver: booking.owner,
        renter: booking.renter,
        summary: booking.listing.title,
      })),
      ...driverBookings.map((booking) => ({
        bookingType: 'driver' as const,
        id: booking.id,
        status: booking.status,
        amountRwf: booking.totalAmountRwf,
        startsAt: booking.startAt,
        endsAt: booking.endAt,
        createdAt: booking.createdAt,
        ownerOrDriver: booking.driver,
        renter: booking.renter,
        summary: booking.serviceType,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = merged.length;
    const items = merged.slice((page - 1) * pageSize, page * pageSize);

    return {
      page,
      pageSize,
      total,
      items,
    };
  }

  async getBookingDetail(type: 'car' | 'driver', bookingId: string) {
    if (type !== 'car' && type !== 'driver') {
      throw new BadRequestException('Booking type must be "car" or "driver".');
    }
    if (type === 'car') {
      const booking = await prisma.carBooking.findUnique({
        where: { id: bookingId },
        include: {
          listing: true,
          owner: true,
          renter: true,
          disputes: true,
          messages: {
            include: {
              sender: { select: { id: true, fullName: true } },
              receiver: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found.');
      }
      return { bookingType: 'car', ...booking };
    }

    const booking = await prisma.driverBooking.findUnique({
      where: { id: bookingId },
      include: {
        driver: true,
        renter: true,
        disputes: true,
        messages: {
          include: {
            sender: { select: { id: true, fullName: true } },
            receiver: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }
    return { bookingType: 'driver', ...booking };
  }

  async cancelBooking(type: 'car' | 'driver', bookingId: string, payload?: { reason?: string }) {
    if (type !== 'car' && type !== 'driver') {
      throw new BadRequestException('Booking type must be "car" or "driver".');
    }
    if (type === 'car') {
      const booking = await prisma.carBooking.findUnique({ where: { id: bookingId } });
      if (!booking) {
        throw new NotFoundException('Booking not found.');
      }
      if (BOOKING_FINAL_STATUSES.has(booking.status)) {
        throw new BadRequestException('Booking is already finalized.');
      }

      const updated = await prisma.carBooking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.cancelled_admin },
      });

      this.notificationsService.emitInAppToUsers(
        [updated.ownerId, updated.renterId],
        realtimeEvents.bookingCancelledAdmin,
        {
          bookingId: updated.id,
          bookingType: 'car',
          reason: payload?.reason,
        },
      );
      this.notificationsService.queueSmsToUsers(
        [updated.ownerId, updated.renterId],
        'A Rentingi booking was cancelled by admin support. Please review your app notifications for details.',
      );

      return updated;
    }

    const booking = await prisma.driverBooking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }
    if (BOOKING_FINAL_STATUSES.has(booking.status)) {
      throw new BadRequestException('Booking is already finalized.');
    }

    const updated = await prisma.driverBooking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.cancelled_admin },
    });

    this.notificationsService.emitInAppToUsers(
      [updated.driverId, updated.renterId],
      realtimeEvents.bookingCancelledAdmin,
      {
        bookingId: updated.id,
        bookingType: 'driver',
        reason: payload?.reason,
      },
    );
    this.notificationsService.queueSmsToUsers(
      [updated.driverId, updated.renterId],
      'A Rentingi booking was cancelled by admin support. Please review your app notifications for details.',
    );

    return updated;
  }

  async getAnalytics() {
    const now = new Date();
    const startWindow = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthKeys = this.lastSixMonthKeys(now);

    const [users, carBookings, driverBookings, subscriptions, trustScores] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: startWindow } },
        select: { createdAt: true, primaryRole: true },
      }),
      prisma.carBooking.findMany({
        where: { createdAt: { gte: startWindow } },
        select: { createdAt: true, status: true },
      }),
      prisma.driverBooking.findMany({
        where: { createdAt: { gte: startWindow } },
        select: { createdAt: true, status: true },
      }),
      prisma.subscription.findMany({
        where: {
          startsAt: { gte: startWindow },
          status: { in: [SubscriptionStatus.active, SubscriptionStatus.cancelled, SubscriptionStatus.expired] },
        },
        select: { startsAt: true, tier: true, amountRwf: true },
      }),
      prisma.user.findMany({ select: { trustScore: true } }),
    ]);

    const userGrowth = monthKeys.map((key) => ({
      month: key,
      renter: 0,
      car_owner: 0,
      driver: 0,
    }));
    const bookingVolume = monthKeys.map((key) => ({
      month: key,
      car: 0,
      driver: 0,
    }));
    const revenueByTier = monthKeys.map((key) => ({
      month: key,
      free: 0,
      standard: 0,
      premium: 0,
      business: 0,
    }));

    const userGrowthMap = new Map(userGrowth.map((item) => [item.month, item]));
    const bookingMap = new Map(bookingVolume.map((item) => [item.month, item]));
    const revenueMap = new Map(revenueByTier.map((item) => [item.month, item]));

    for (const user of users) {
      const key = this.monthKey(user.createdAt);
      const slot = userGrowthMap.get(key);
      if (slot) {
        slot[user.primaryRole] += 1;
      }
    }
    for (const booking of carBookings) {
      const key = this.monthKey(booking.createdAt);
      const slot = bookingMap.get(key);
      if (slot) {
        slot.car += 1;
      }
    }
    for (const booking of driverBookings) {
      const key = this.monthKey(booking.createdAt);
      const slot = bookingMap.get(key);
      if (slot) {
        slot.driver += 1;
      }
    }
    for (const sub of subscriptions) {
      const key = this.monthKey(sub.startsAt);
      const slot = revenueMap.get(key);
      if (slot) {
        slot[sub.tier] += sub.amountRwf;
      }
    }

    const allBookings = [...carBookings, ...driverBookings];
    const cancelledStatuses = new Set<BookingStatus>([
      BookingStatus.cancelled_by_owner,
      BookingStatus.cancelled_by_renter,
      BookingStatus.cancelled_admin,
      BookingStatus.auto_cancelled,
    ]);
    const noShowStatuses = new Set<BookingStatus>([BookingStatus.auto_cancelled]);
    const cancellationCount = allBookings.filter((item) => cancelledStatuses.has(item.status)).length;
    const noShowCount = allBookings.filter((item) => noShowStatuses.has(item.status)).length;
    const totalBookings = allBookings.length || 1;

    return {
      userGrowth,
      bookingVolume,
      subscriptionRevenueByTier: revenueByTier,
      cancellationNoShowRates: {
        cancellationRate: cancellationCount / totalBookings,
        noShowRate: noShowCount / totalBookings,
        totalBookings: allBookings.length,
      },
      trustScoreDistribution: this.computeTrustDistribution(
        trustScores.map((item) => Number(item.trustScore)),
      ),
    };
  }

  async listListings(query: ListListingsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CarListingWhereInput = {
      status: query.status ?? ListingStatus.pending_approval,
    };

    const [total, listings] = await Promise.all([
      prisma.carListing.count({ where }),
      prisma.carListing.findMany({
        where,
        include: {
          owner: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items: listings };
  }

  async approveListing(listingId: string) {
    const listing = await prisma.carListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found.');
    if (listing.status !== ListingStatus.pending_approval) {
      throw new BadRequestException('Only listings pending approval can be approved.');
    }

    const updated = await prisma.carListing.update({
      where: { id: listingId },
      data: { status: ListingStatus.active },
    });

    this.notificationsService.emitInAppToUsers(
      [listing.ownerId],
      realtimeEvents.listingApproved,
      { listingId: listing.id, title: listing.title },
    );

    return updated;
  }

  async rejectListing(listingId: string, payload: RejectListingDto) {
    const listing = await prisma.carListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found.');
    if (listing.status !== ListingStatus.pending_approval) {
      throw new BadRequestException('Only listings pending approval can be rejected.');
    }

    const updated = await prisma.carListing.update({
      where: { id: listingId },
      data: { status: ListingStatus.rejected },
    });

    this.notificationsService.emitInAppToUsers(
      [listing.ownerId],
      realtimeEvents.listingRejected,
      { listingId: listing.id, title: listing.title, reason: payload.reason },
    );

    return { ...updated, rejectionReason: payload.reason };
  }

  async deleteListing(listingId: string) {
    const listing = await prisma.carListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found.');
    await prisma.carListing.delete({ where: { id: listingId } });
    return { deleted: true, listingId };
  }

  async adminCreateCar(payload: AdminCreateCarDto) {
    const owner = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, roles: { select: { role: true } } },
    });
    if (!owner) throw new NotFoundException('User not found.');

    const hasOwnerRole = owner.roles.some((r) => r.role === RoleType.car_owner);
    if (!hasOwnerRole) {
      await prisma.userRole.create({ data: { userId: owner.id, role: RoleType.car_owner } });
      await prisma.user.update({
        where: { id: owner.id },
        data: { primaryRole: RoleType.car_owner },
      });
    }

    const listing = await prisma.carListing.create({
      data: {
        ownerId: owner.id,
        title: payload.title,
        description: payload.description,
        vehicleType: payload.vehicleType,
        serviceType: payload.serviceType,
        brand: payload.brand,
        model: payload.model,
        year: payload.year,
        seats: payload.seats,
        transmission: payload.transmission,
        fuelType: payload.fuelType,
        dailyRateKigaliRwf: payload.dailyRateKigaliRwf,
        dailyRateCountrysideRwf: payload.dailyRateCountrysideRwf,
        locationText: payload.locationText,
        photos: payload.photos ?? [],
        features: payload.features ?? [],
        status: ListingStatus.active,
      },
    });

    return listing;
  }

  async listDrivers(query: ListDriversQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();

    const userWhere: Prisma.UserWhereInput = search
      ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
      : {};

    const [total, profiles] = await Promise.all([
      prisma.driverProfile.count({ where: { user: userWhere } }),
      prisma.driverProfile.findMany({
        where: { user: userWhere },
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { page, pageSize, total, items: profiles };
  }

  async deleteDriver(driverProfileId: string) {
    const profile = await prisma.driverProfile.findUnique({ where: { id: driverProfileId } });
    if (!profile) throw new NotFoundException('Driver profile not found.');
    await prisma.driverProfile.delete({ where: { id: driverProfileId } });
    return { deleted: true, driverProfileId };
  }

  async adminCreateDriver(payload: AdminCreateDriverDto) {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, roles: { select: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found.');

    const existing = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
    if (existing) throw new BadRequestException('User already has a driver profile.');

    const hasDriverRole = user.roles.some((r) => r.role === RoleType.driver);
    if (!hasDriverRole) {
      await prisma.userRole.create({ data: { userId: user.id, role: RoleType.driver } });
      await prisma.user.update({
        where: { id: user.id },
        data: { primaryRole: RoleType.driver },
      });
    }

    const profile = await prisma.driverProfile.create({
      data: {
        userId: user.id,
        driverCategory: payload.driverCategory,
        yearsExperience: payload.yearsExperience,
        biography: payload.biography,
        dailyRateRwf: payload.dailyRateRwf,
        hourlyRateRwf: payload.hourlyRateRwf,
        primaryCity: payload.primaryCity,
        languages: payload.languages,
        categories: payload.categories,
        vehicleTypes: payload.vehicleTypes,
        certifications: payload.certifications ?? [],
        serviceAreas: payload.serviceAreas,
        availabilityCalendar: [],
      },
    });

    return profile;
  }

  async grantAdminRole(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, clerkId: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    if (!user.clerkId) throw new BadRequestException('User does not have a linked Clerk account.');

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    await clerk.users.updateUserMetadata(user.clerkId, {
      publicMetadata: { role: 'admin' },
    });

    return { userId: user.id, email: user.email, adminGranted: true };
  }

  async revokeAdminRole(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, clerkId: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    if (!user.clerkId) throw new BadRequestException('User does not have a linked Clerk account.');

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    await clerk.users.updateUserMetadata(user.clerkId, {
      publicMetadata: { role: null },
    });

    return { userId: user.id, email: user.email, adminRevoked: true };
  }

  private async ensureUserExists(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }
  }

  private trustTierRange(trustTier: TrustTierFilter) {
    switch (trustTier) {
      case TrustTierFilter.platinum:
        return { gte: 100 };
      case TrustTierFilter.gold:
        return { gte: 95, lt: 100 };
      case TrustTierFilter.silver:
        return { gte: 90, lt: 95 };
      case TrustTierFilter.bronze:
        return { gte: 85, lt: 90 };
      case TrustTierFilter.standard:
        return { gte: 80, lt: 85 };
      case TrustTierFilter.warning:
        return { gte: 60, lt: 80 };
      case TrustTierFilter.suspended:
        return { lt: 60 };
    }
  }

  private deriveTrustTier(score: number): string {
    if (score >= 100) return 'Platinum';
    if (score >= 95) return 'Gold';
    if (score >= 90) return 'Silver';
    if (score >= 85) return 'Bronze';
    if (score >= 80) return 'Standard';
    if (score < 60) return 'Suspended';
    return 'Warning';
  }

  private computeTrustDistribution(scores: number[]) {
    const distribution = {
      platinum: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
      standard: 0,
      warning: 0,
      suspended: 0,
    };

    for (const score of scores) {
      if (score >= 100) distribution.platinum += 1;
      else if (score >= 95) distribution.gold += 1;
      else if (score >= 90) distribution.silver += 1;
      else if (score >= 85) distribution.bronze += 1;
      else if (score >= 80) distribution.standard += 1;
      else if (score < 60) distribution.suspended += 1;
      else distribution.warning += 1;
    }

    return distribution;
  }

  private disputePriority(status: DisputeStatus, createdAt: Date): 'low' | 'medium' | 'high' {
    if (status === DisputeStatus.escalated) {
      return 'high';
    }
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    if (ageHours >= 48) {
      return 'high';
    }
    if (ageHours >= 24 || status === DisputeStatus.waiting_evidence) {
      return 'medium';
    }
    return 'low';
  }

  private monthKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private lastSixMonthKeys(now: Date) {
    return Array.from({ length: 6 }).map((_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return this.monthKey(monthDate);
    });
  }
}
