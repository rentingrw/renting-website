import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ListingStatus,
  PaymentMethod,
  Prisma,
  SubscriptionKind,
  SubscriptionStatus,
  SubscriptionTier,
  TaxiDriverStatus,
  type PromoCode,
  type User,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { NotificationsService } from '../notifications/notifications.service';
import { realtimeEvents } from '../realtime/realtime.events';
import {
  type ProductTier,
  DRIVER_PLAN,
  HOSTER_PLANS,
  TAXI_PLAN,
  getTierPlan,
  liveSubscriptionWhere,
  productTierToStoredTier,
  storedTierToProductTier,
} from './subscription-tier.util';
import {
  applyPromoAmount,
  assertPromoUsable,
  incrementPromoRedemption,
  normalizePromoCode,
} from './promo-code.util';
import {
  SubscriptionPaymentMethodDto,
  type InitiateSubscriptionDto,
} from './dto/initiate-subscription.dto';
import type { InitiateDriverSubscriptionDto } from './dto/initiate-driver-subscription.dto';
import type { InitiateTaxiSubscriptionDto } from './dto/initiate-taxi-subscription.dto';
import type { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { initiateIPayCharge } from './ipay-mopay.adapter';
import {
  subscriptionActivatedEmailHtml,
  subscriptionPaymentConfirmedEmailHtml,
  subscriptionRenewalReminderEmailHtml,
  subscriptionExpiredEmailHtml,
} from '../notifications/email-templates';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  getPlans() {
    return {
      hoster: HOSTER_PLANS,
      driver: DRIVER_PLAN,
      taxi: TAXI_PLAN,
    };
  }

  async initiate(authUser: AuthenticatedUser, payload: InitiateSubscriptionDto) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const plan = getTierPlan(payload.tier);
    return this.startProviderSubscription({
      user: owner,
      kind: SubscriptionKind.hoster,
      storedTier: productTierToStoredTier(payload.tier),
      listPriceRwf: plan.priceRwf,
      payload,
      message: `Renting.rw ${plan.label} subscription`,
      extra: { tier: payload.tier },
    });
  }

  async handleIPayCallback(transactionId: string, status: number) {
    if (!transactionId) {
      throw new BadRequestException('transactionId is required.');
    }
    if (status !== 200) {
      return { ok: true, processed: false, reason: 'Payment not successful.', transactionId, status };
    }
    return this.processSuccessfulPayment(transactionId);
  }

  async getMine(authUser: AuthenticatedUser) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const now = new Date();

    const [effectivePublishSubscription, latestSubscription, activeListingCount] = await Promise.all([
      this.findEffectivePublishSubscription(owner.id, now),
      prisma.subscription.findFirst({
        where: { userId: owner.id, kind: SubscriptionKind.hoster },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.carListing.count({
        where: {
          ownerId: owner.id,
          status: ListingStatus.active,
        },
      }),
    ]);

    const selected = effectivePublishSubscription ?? latestSubscription;
    if (!selected) {
      return {
        subscription: null,
        activeCars: activeListingCount,
        maxCars: 0,
        canPublish: false,
        locationBoost: false,
        verified: false,
        instantBooking: false,
        publicContact: false,
      };
    }

    const tier = storedTierToProductTier(selected.tier);
    const plan = getTierPlan(tier);
    const effectivePlan = effectivePublishSubscription
      ? getTierPlan(storedTierToProductTier(effectivePublishSubscription.tier))
      : null;
    const canPublish =
      effectivePlan !== null &&
      (effectivePlan.maxCars === null || activeListingCount < effectivePlan.maxCars);

    return {
      subscription: {
        id: selected.id,
        status: this.mapStatusForClient(selected.status),
        tier,
        kind: selected.kind,
        renewsAt: selected.renewsAt,
        amountRwf: selected.amountRwf,
        paymentMethod: selected.paymentMethod,
      },
      activeCars: activeListingCount,
      maxCars: plan.maxCars,
      canPublish,
      locationBoost: plan.locationBoost,
      verified: plan.verified,
      instantBooking: plan.instantBooking,
      publicContact: plan.publicContact,
    };
  }

  async upgrade(authUser: AuthenticatedUser, payload: UpgradeSubscriptionDto) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const targetPlan = getTierPlan(payload.tier);
    const existing = await prisma.subscription.findFirst({
      where: {
        userId: owner.id,
        ...liveSubscriptionWhere(SubscriptionKind.hoster),
      },
      orderBy: { startsAt: 'desc' },
    });

    if (existing && storedTierToProductTier(existing.tier) === payload.tier) {
      throw new BadRequestException('You are already on this subscription tier.');
    }

    const currentPrice = existing ? getTierPlan(storedTierToProductTier(existing.tier)).priceRwf : 0;
    const amountToCharge = Math.max(0, targetPlan.priceRwf - currentPrice);

    if (amountToCharge === 0) {
      const activated = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const renewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const activatedSubscription = await tx.subscription.create({
          data: {
            userId: owner.id,
            kind: SubscriptionKind.hoster,
            tier: productTierToStoredTier(payload.tier),
            status: SubscriptionStatus.active,
            amountRwf: amountToCharge,
            paymentMethod: this.mapDtoMethod(payload.paymentMethod),
            externalRef: `tier-change-${randomUUID()}`,
            startsAt: now,
            renewsAt,
          },
        });

        await tx.subscription.updateMany({
          where: {
            userId: owner.id,
            kind: SubscriptionKind.hoster,
            status: { in: [SubscriptionStatus.active, SubscriptionStatus.cancelled] },
            id: { not: activatedSubscription.id },
          },
          data: {
            status: SubscriptionStatus.expired,
            endsAt: now,
          },
        });

        await this.pauseExcessListingsForTier(tx, owner.id, payload.tier);
        await this.syncVerifiedBadge(tx, owner.id);
        return activatedSubscription;
      });

      this.notificationsService.emitInAppToUsers([owner.id], realtimeEvents.subscriptionActivated, {
        subscriptionId: activated.id,
        tier: payload.tier,
        renewsAt: activated.renewsAt,
      });
      this.notificationsService.queueEmailToUsers(
        [owner.id],
        'Subscription activated on Rentingi',
        `Your ${payload.tier} subscription is now active.`,
        subscriptionActivatedEmailHtml(owner.fullName, payload.tier, activated.renewsAt),
      );

      return {
        paymentRequired: false,
        activated: true,
        reference: activated.externalRef,
        tier: payload.tier,
      };
    }

    const reference = randomUUID();
    const paymentMethod = this.mapDtoMethod(payload.paymentMethod);
    const promo = await this.resolvePromo(payload.promoCode, SubscriptionKind.hoster);
    const priced = applyPromoAmount(amountToCharge, promo);
    const created = await prisma.subscription.create({
      data: {
        userId: owner.id,
        kind: SubscriptionKind.hoster,
        tier: productTierToStoredTier(payload.tier),
        status: priced.waived ? SubscriptionStatus.active : SubscriptionStatus.pending_payment,
        amountRwf: priced.amountRwf,
        paymentMethod,
        externalRef: reference,
        promoCodeId: promo?.id,
        startsAt: new Date(),
        renewsAt: priced.waived ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
      },
    });

    if (priced.waived) {
      await prisma.$transaction(async (tx) => {
        if (promo) await incrementPromoRedemption(tx, promo.id);
        await this.expireSameKind(tx, owner.id, SubscriptionKind.hoster, created.id);
        await this.pauseExcessListingsForTier(tx, owner.id, payload.tier);
        await this.syncVerifiedBadge(tx, owner.id);
      });
      return {
        paymentRequired: false,
        activated: true,
        subscriptionId: created.id,
        reference,
        status: 'active',
        tier: payload.tier,
        amountRwf: 0,
        promoCode: promo?.code,
      };
    }

    const callbackUrl = this.buildCallbackUrl();
    const gatewayResponse = await initiateIPayCharge({
      phoneNumber: payload.mobileNumber,
      amount: priced.amountRwf,
      txRef: reference,
      message: `Renting.rw ${payload.tier} subscription`,
      callbackUrl,
    });

    return {
      subscriptionId: created.id,
      reference,
      status: 'pending_payment',
      tier: payload.tier,
      amountRwf: priced.amountRwf,
      paymentMethod: payload.paymentMethod,
      promoCode: promo?.code,
      providerTransactionId: gatewayResponse.transactionId,
    };
  }

  async cancel(authUser: AuthenticatedUser) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const active = await prisma.subscription.findFirst({
      where: {
        userId: owner.id,
        kind: SubscriptionKind.hoster,
        status: SubscriptionStatus.active,
      },
      orderBy: { startsAt: 'desc' },
    });

    if (!active) {
      throw new BadRequestException('No active subscription found to cancel.');
    }

    const pauseAt = active.renewsAt ?? new Date();
    const cancelled = await prisma.subscription.update({
      where: { id: active.id },
      data: {
        status: SubscriptionStatus.cancelled,
        endsAt: pauseAt,
      },
    });

    return {
      id: cancelled.id,
      status: 'cancelled',
      pauseActiveListingsAt: pauseAt,
      renewsAt: cancelled.renewsAt,
    };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async enforceCancelledRenewalsCron() {
    await this.enforceCancelledRenewals();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireStaleSubscriptionsCron() {
    const now = new Date();
    const stale = await prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.active, SubscriptionStatus.cancelled] },
        renewsAt: { not: null, lt: now },
      },
      select: {
        id: true,
        userId: true,
        kind: true,
        tier: true,
        user: { select: { fullName: true } },
      },
    });

    if (stale.length === 0) return;

    for (const sub of stale) {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.expired, endsAt: now },
        });
        if (sub.kind === SubscriptionKind.hoster) {
          const stillLive = await tx.subscription.findFirst({
            where: { userId: sub.userId, ...liveSubscriptionWhere(SubscriptionKind.hoster, now) },
            select: { id: true },
          });
          if (!stillLive) {
            await tx.carListing.updateMany({
              where: { ownerId: sub.userId, status: ListingStatus.active },
              data: { status: ListingStatus.paused },
            });
          }
          await this.syncVerifiedBadge(tx, sub.userId);
        }
      });

      const label =
        sub.kind === SubscriptionKind.driver
          ? 'driver'
          : sub.kind === SubscriptionKind.taxi
            ? 'taxi'
            : storedTierToProductTier(sub.tier);
      this.notificationsService.queueEmailToUsers(
        [sub.userId],
        'Your listing has expired — renting.rw',
        'Your monthly subscription has expired. Renew to stay visible to customers.',
        subscriptionExpiredEmailHtml(sub.user.fullName, String(label)),
      );
    }

    this.logger.log(`Expired ${stale.length} stale subscription(s).`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendRenewalRemindersCron() {
    await this.sendRenewalReminders();
  }

  async enforceCancelledRenewals(now: Date = new Date()) {
    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        kind: SubscriptionKind.hoster,
        status: SubscriptionStatus.cancelled,
        renewsAt: { lte: now },
      },
      distinct: ['userId'],
      select: {
        userId: true,
        tier: true,
        user: { select: { fullName: true } },
      },
    });

    for (const sub of dueSubscriptions) {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.updateMany({
          where: {
            userId: sub.userId,
            status: SubscriptionStatus.cancelled,
            renewsAt: { lte: now },
          },
          data: {
            status: SubscriptionStatus.expired,
            endsAt: now,
          },
        });

        await tx.carListing.updateMany({
          where: {
            ownerId: sub.userId,
            status: ListingStatus.active,
          },
          data: {
            status: ListingStatus.paused,
          },
        });
      });

      const tierLabel = storedTierToProductTier(sub.tier);
      this.notificationsService.queueEmailToUsers(
        [sub.userId],
        'Subscription expired — renting.rw',
        `Your ${tierLabel} subscription has expired and your listings have been paused.`,
        subscriptionExpiredEmailHtml(sub.user.fullName, tierLabel),
      );
    }
    if (dueSubscriptions.length > 0) {
      this.logger.log(
        `Expired cancelled subscriptions and paused listings for ${dueSubscriptions.length} owner(s).`,
      );
    }
  }

  async sendRenewalReminders(now: Date = new Date()) {
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const dueSoon = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.active,
        renewsAt: { gte: now, lte: inThreeDays },
      },
      select: {
        id: true,
        userId: true,
        tier: true,
        renewsAt: true,
        user: { select: { fullName: true } },
      },
    });

    for (const subscription of dueSoon) {
      const renewDate = subscription.renewsAt?.toISOString().slice(0, 10) ?? 'soon';
      const tierLabel = storedTierToProductTier(subscription.tier);
      this.notificationsService.queueSmsToUsers(
        [subscription.userId],
        `Your Rentingi subscription renews on ${renewDate}. Ensure your mobile money wallet is funded.`,
      );
      this.notificationsService.queueEmailToUsers(
        [subscription.userId],
        'Subscription renewal reminder — renting.rw',
        `Your ${tierLabel} subscription renews on ${renewDate}.`,
        subscriptionRenewalReminderEmailHtml(subscription.user.fullName, tierLabel, renewDate),
      );
    }
  }

  private async processSuccessfulPayment(reference: string) {
    const activated = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findFirst({
        where: { externalRef: reference },
      });
      if (!subscription) {
        return null;
      }
      if (subscription.status === SubscriptionStatus.active) {
        return subscription;
      }

      const now = new Date();
      const renewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.active,
          startsAt: now,
          renewsAt,
          endsAt: null,
        },
      });

      if (subscription.promoCodeId) {
        await incrementPromoRedemption(tx, subscription.promoCodeId);
      }

      await this.expireSameKind(tx, subscription.userId, subscription.kind, subscription.id);

      if (subscription.kind === SubscriptionKind.hoster) {
        await tx.carListing.updateMany({
          where: {
            ownerId: subscription.userId,
            status: ListingStatus.draft,
          },
          data: {
            status: ListingStatus.active,
          },
        });

        await this.pauseExcessListingsForTier(
          tx,
          subscription.userId,
          storedTierToProductTier(subscription.tier),
        );
        await this.syncVerifiedBadge(tx, subscription.userId);
      }
      if (subscription.kind === SubscriptionKind.taxi) {
        await tx.taxiDriver.updateMany({
          where: { userId: subscription.userId },
          data: { status: TaxiDriverStatus.approved },
        });
      }
      return updated;
    });

    if (!activated) {
      return {
        ok: true,
        processed: false,
        reason: 'Subscription reference not found.',
        reference,
      };
    }

    const activatedTier = storedTierToProductTier(activated.tier);
    const activatedUser = await prisma.user.findUnique({
      where: { id: activated.userId },
      select: { fullName: true },
    });
    this.notificationsService.emitInAppToUsers([activated.userId], realtimeEvents.subscriptionActivated, {
      subscriptionId: activated.id,
      tier: activatedTier,
      renewsAt: activated.renewsAt,
      reference,
    });
    this.notificationsService.queueEmailToUsers(
      [activated.userId],
      'Subscription payment confirmed',
      `Your ${activatedTier} subscription is active and ready to use.`,
      subscriptionPaymentConfirmedEmailHtml(
        activatedUser?.fullName ?? 'there',
        activatedTier,
        activated.renewsAt,
        reference,
      ),
    );

    return {
      ok: true,
      processed: true,
      provider: 'flutterwave',
      subscriptionId: activated.id,
      status: 'active',
      renewsAt: activated.renewsAt,
      reference,
    };
  }

  async getPaymentHistory(authUser: AuthenticatedUser) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const history = await prisma.subscription.findMany({
      where: { userId: owner.id, kind: SubscriptionKind.hoster },
      orderBy: { createdAt: 'desc' },
      take: 24,
    });
    return history.map((s) => ({
      id: s.id,
      tier: storedTierToProductTier(s.tier),
      status: this.mapStatusForClient(s.status),
      amountRwf: s.amountRwf,
      paymentMethod: s.paymentMethod,
      startsAt: s.startsAt,
      renewsAt: s.renewsAt,
      endsAt: s.endsAt,
      createdAt: s.createdAt,
    }));
  }

  async getDriverPaymentHistory(authUser: AuthenticatedUser) {
    const driver = await this.requireDriver(authUser.clerkUserId);
    const history = await prisma.subscription.findMany({
      where: { userId: driver.id, kind: SubscriptionKind.driver },
      orderBy: { createdAt: 'desc' },
      take: 24,
    });
    return history.map((s: (typeof history)[number]) => ({
      id: s.id,
      status: this.mapStatusForClient(s.status),
      amountRwf: s.amountRwf,
      paymentMethod: s.paymentMethod,
      startsAt: s.startsAt,
      renewsAt: s.renewsAt,
      endsAt: s.endsAt,
      createdAt: s.createdAt,
    }));
  }

  async initiateDriver(authUser: AuthenticatedUser, payload: InitiateDriverSubscriptionDto) {
    const driver = await this.requireDriver(authUser.clerkUserId);
    return this.startProviderSubscription({
      user: driver,
      kind: SubscriptionKind.driver,
      storedTier: SubscriptionTier.standard,
      listPriceRwf: DRIVER_PLAN.priceRwf,
      payload,
      message: 'Renting.rw driver subscription',
    });
  }

  async getDriverSubscriptionMine(authUser: AuthenticatedUser) {
    const driver = await this.requireDriver(authUser.clerkUserId);
    const now = new Date();

    const effective = await prisma.subscription.findFirst({
      where: {
        userId: driver.id,
        ...liveSubscriptionWhere(SubscriptionKind.driver, now),
      },
      orderBy: { startsAt: 'desc' },
    });

    const latest = effective ?? await prisma.subscription.findFirst({
      where: { userId: driver.id, kind: SubscriptionKind.driver },
      orderBy: { createdAt: 'desc' },
    });

    return {
      subscription: latest
        ? {
            id: latest.id,
            status: this.mapStatusForClient(latest.status),
            renewsAt: latest.renewsAt,
            amountRwf: latest.amountRwf,
            paymentMethod: latest.paymentMethod,
          }
        : null,
      isActive: effective !== null,
      planPriceRwf: DRIVER_PLAN.priceRwf,
    };
  }

  async cancelDriverSubscription(authUser: AuthenticatedUser) {
    const driver = await this.requireDriver(authUser.clerkUserId);
    const active = await prisma.subscription.findFirst({
      where: {
        userId: driver.id,
        kind: SubscriptionKind.driver,
        status: SubscriptionStatus.active,
      },
      orderBy: { startsAt: 'desc' },
    });

    if (!active) {
      throw new BadRequestException('No active driver subscription found to cancel.');
    }

    const pauseAt = active.renewsAt ?? new Date();
    const cancelled = await prisma.subscription.update({
      where: { id: active.id },
      data: {
        status: SubscriptionStatus.cancelled,
        endsAt: pauseAt,
      },
    });

    return {
      id: cancelled.id,
      status: 'cancelled',
      expiresAt: pauseAt,
    };
  }

  async initiateTaxi(authUser: AuthenticatedUser, payload: InitiateTaxiSubscriptionDto) {
    const taxiUser = await this.requireTaxi(authUser.clerkUserId);
    return this.startProviderSubscription({
      user: taxiUser,
      kind: SubscriptionKind.taxi,
      storedTier: SubscriptionTier.standard,
      listPriceRwf: TAXI_PLAN.priceRwf,
      payload,
      message: 'Renting.rw taxi subscription',
    });
  }

  async getTaxiSubscriptionMine(authUser: AuthenticatedUser) {
    const taxiUser = await this.requireTaxi(authUser.clerkUserId);
    const now = new Date();
    const effective = await prisma.subscription.findFirst({
      where: {
        userId: taxiUser.id,
        ...liveSubscriptionWhere(SubscriptionKind.taxi, now),
      },
      orderBy: { startsAt: 'desc' },
    });
    const latest = effective ?? await prisma.subscription.findFirst({
      where: { userId: taxiUser.id, kind: SubscriptionKind.taxi },
      orderBy: { createdAt: 'desc' },
    });
    return {
      subscription: latest
        ? {
            id: latest.id,
            status: this.mapStatusForClient(latest.status),
            renewsAt: latest.renewsAt,
            amountRwf: latest.amountRwf,
            paymentMethod: latest.paymentMethod,
          }
        : null,
      isActive: effective !== null,
      planPriceRwf: TAXI_PLAN.priceRwf,
    };
  }

  async cancelTaxiSubscription(authUser: AuthenticatedUser) {
    const taxiUser = await this.requireTaxi(authUser.clerkUserId);
    const active = await prisma.subscription.findFirst({
      where: {
        userId: taxiUser.id,
        kind: SubscriptionKind.taxi,
        status: SubscriptionStatus.active,
      },
      orderBy: { startsAt: 'desc' },
    });
    if (!active) {
      throw new BadRequestException('No active taxi subscription found to cancel.');
    }
    const pauseAt = active.renewsAt ?? new Date();
    const cancelled = await prisma.subscription.update({
      where: { id: active.id },
      data: { status: SubscriptionStatus.cancelled, endsAt: pauseAt },
    });
    return { id: cancelled.id, status: 'cancelled', expiresAt: pauseAt };
  }

  async getTaxiPaymentHistory(authUser: AuthenticatedUser) {
    const taxiUser = await this.requireTaxi(authUser.clerkUserId);
    const history = await prisma.subscription.findMany({
      where: { userId: taxiUser.id, kind: SubscriptionKind.taxi },
      orderBy: { createdAt: 'desc' },
      take: 24,
    });
    return history.map((s) => ({
      id: s.id,
      status: this.mapStatusForClient(s.status),
      amountRwf: s.amountRwf,
      paymentMethod: s.paymentMethod,
      startsAt: s.startsAt,
      renewsAt: s.renewsAt,
      endsAt: s.endsAt,
      createdAt: s.createdAt,
    }));
  }

  private buildCallbackUrl(): string {
    const base = (process.env.PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
    return `${base}/subscriptions/callback/ipay`;
  }

  private async findEffectivePublishSubscription(userId: string, now: Date) {
    return prisma.subscription.findFirst({
      where: {
        userId,
        ...liveSubscriptionWhere(SubscriptionKind.hoster, now),
      },
      orderBy: { startsAt: 'desc' },
    });
  }

  private async pauseExcessListingsForTier(
    tx: Prisma.TransactionClient,
    ownerId: string,
    tier: ProductTier,
  ) {
    const plan = getTierPlan(tier);
    if (plan.maxCars === null) {
      return;
    }

    const activeListings = await tx.carListing.findMany({
      where: {
        ownerId,
        status: ListingStatus.active,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (activeListings.length <= plan.maxCars) {
      return;
    }

    const listingIdsToPause = activeListings.slice(plan.maxCars).map((item: { id: string }) => item.id);
    if (listingIdsToPause.length === 0) {
      return;
    }

    await tx.carListing.updateMany({
      where: {
        id: { in: listingIdsToPause },
      },
      data: {
        status: ListingStatus.paused,
      },
    });
  }

  private mapDtoMethod(method: SubscriptionPaymentMethodDto): PaymentMethod {
    return method === SubscriptionPaymentMethodDto.airtel_money
      ? PaymentMethod.airtel_money
      : PaymentMethod.momo;
  }

  private mapStatusForClient(status: SubscriptionStatus): string {
    switch (status) {
      case SubscriptionStatus.unpaid:
      case SubscriptionStatus.past_due:
      case SubscriptionStatus.draft:
      case SubscriptionStatus.pending_payment:
        return 'pending_payment';
      case SubscriptionStatus.cancelled:
        return 'cancelled';
      case SubscriptionStatus.suspended:
        return 'suspended';
      default:
        return status;
    }
  }

  private async requireTaxi(clerkUserId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: { taxiDriver: { select: { id: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('User not found. Sync your account first.');
    }
    if (user.deletedAt) {
      throw new ForbiddenException('This account has been deactivated.');
    }
    if (!user.taxiDriver) {
      throw new ForbiddenException('Register as a taxi driver before subscribing.');
    }
    return user;
  }

  private async startProviderSubscription(params: {
    user: User;
    kind: SubscriptionKind;
    storedTier: SubscriptionTier;
    listPriceRwf: number;
    payload: { paymentMethod: SubscriptionPaymentMethodDto; mobileNumber: string; promoCode?: string };
    message: string;
    extra?: Record<string, unknown>;
  }) {
    const promo = await this.resolvePromo(params.payload.promoCode, params.kind);
    const priced = applyPromoAmount(params.listPriceRwf, promo);
    const reference = randomUUID();
    const paymentMethod = this.mapDtoMethod(params.payload.paymentMethod);
    const now = new Date();
    const renewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const created = await prisma.subscription.create({
      data: {
        userId: params.user.id,
        kind: params.kind,
        tier: params.storedTier,
        status: priced.waived ? SubscriptionStatus.active : SubscriptionStatus.pending_payment,
        amountRwf: priced.amountRwf,
        paymentMethod,
        externalRef: reference,
        promoCodeId: promo?.id,
        startsAt: now,
        renewsAt: priced.waived ? renewsAt : undefined,
      },
    });

    if (priced.waived) {
      await prisma.$transaction(async (tx) => {
        if (promo) await incrementPromoRedemption(tx, promo.id);
        await this.expireSameKind(tx, params.user.id, params.kind, created.id);
        if (params.kind === SubscriptionKind.hoster) {
          await this.pauseExcessListingsForTier(
            tx,
            params.user.id,
            storedTierToProductTier(params.storedTier),
          );
          await this.syncVerifiedBadge(tx, params.user.id);
        }
        if (params.kind === SubscriptionKind.taxi) {
          await tx.taxiDriver.updateMany({
            where: { userId: params.user.id },
            data: { status: TaxiDriverStatus.approved },
          });
        }
      });
      this.notificationsService.queueEmailToUsers(
        [params.user.id],
        'Subscription activated on Renting.rw',
        'Your promo code activated the plan. You are live.',
        subscriptionActivatedEmailHtml(params.user.fullName, storedTierToProductTier(params.storedTier), renewsAt),
      );
      return {
        paymentRequired: false,
        activated: true,
        subscriptionId: created.id,
        reference,
        status: 'active',
        amountRwf: 0,
        promoCode: promo?.code,
        paymentMethod: params.payload.paymentMethod,
        ...params.extra,
      };
    }

    const gatewayResponse = await initiateIPayCharge({
      phoneNumber: params.payload.mobileNumber,
      amount: priced.amountRwf,
      txRef: reference,
      message: params.message,
      callbackUrl: this.buildCallbackUrl(),
    });

    return {
      subscriptionId: created.id,
      reference,
      status: 'pending_payment',
      amountRwf: priced.amountRwf,
      paymentMethod: params.payload.paymentMethod,
      promoCode: promo?.code,
      providerTransactionId: gatewayResponse.transactionId,
      ...params.extra,
    };
  }

  private async resolvePromo(code: string | undefined, kind: SubscriptionKind): Promise<PromoCode | null> {
    if (!code?.trim()) return null;
    const promo = await prisma.promoCode.findUnique({
      where: { code: normalizePromoCode(code) },
    });
    if (!promo) {
      throw new BadRequestException('Promo code not found.');
    }
    assertPromoUsable(promo, kind);
    return promo;
  }

  private async expireSameKind(
    tx: Prisma.TransactionClient,
    userId: string,
    kind: SubscriptionKind,
    keepId: string,
  ) {
    const now = new Date();
    await tx.subscription.updateMany({
      where: {
        userId,
        kind,
        status: { in: [SubscriptionStatus.active, SubscriptionStatus.cancelled, SubscriptionStatus.pending_payment] },
        id: { not: keepId },
      },
      data: { status: SubscriptionStatus.expired, endsAt: now },
    });
  }

  private async syncVerifiedBadge(tx: Prisma.TransactionClient, userId: string) {
    const extraPremium = await tx.subscription.findFirst({
      where: {
        userId,
        tier: SubscriptionTier.business,
        ...liveSubscriptionWhere(SubscriptionKind.hoster),
      },
      select: { id: true },
    });
    await tx.user.update({
      where: { id: userId },
      data: { isVerified: extraPremium !== null },
    });
    if (extraPremium) {
      await tx.carOwnerProfile.updateMany({
        where: { userId, verifiedAt: null },
        data: { verifiedAt: new Date() },
      });
    }
  }

  private async requireDriver(clerkUserId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: { roles: { select: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Sync your account first.');
    }
    if (user.deletedAt) {
      throw new ForbiddenException('This account has been deactivated.');
    }

    const hasDriverRole =
      user.primaryRole === 'driver' || user.roles.some((item: { role: string }) => item.role === 'driver');

    if (!hasDriverRole) {
      throw new ForbiddenException('Only drivers can manage driver subscriptions.');
    }

    return user;
  }

  private async requireCarOwner(clerkUserId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: {
        roles: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Sync your account first.');
    }
    if (user.deletedAt) {
      throw new ForbiddenException('This account has been deactivated.');
    }

    const hasOwnerRole =
      user.primaryRole === 'car_owner' || user.roles.some((item: { role: string }) => item.role === 'car_owner');

    if (!hasOwnerRole) {
      throw new ForbiddenException('Only car owners can manage subscriptions.');
    }

    return user;
  }
}

