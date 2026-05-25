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
  SubscriptionStatus,
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
  getTierPlan,
  productTierToStoredTier,
  storedTierToProductTier,
} from './subscription-tier.util';
import {
  SubscriptionPaymentMethodDto,
  type InitiateSubscriptionDto,
} from './dto/initiate-subscription.dto';
import type { InitiateDriverSubscriptionDto } from './dto/initiate-driver-subscription.dto';
import type { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { initiateFlutterwaveCharge } from './flutterwave.adapter';
import {
  subscriptionActivatedEmailHtml,
  subscriptionPaymentConfirmedEmailHtml,
  subscriptionRenewalReminderEmailHtml,
  subscriptionExpiredEmailHtml,
} from '../notifications/email-templates';

type JsonRecord = Record<string, unknown>;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async initiate(authUser: AuthenticatedUser, payload: InitiateSubscriptionDto) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const plan = getTierPlan(payload.tier);
    const reference = randomUUID();
    const paymentMethod = this.mapDtoMethod(payload.paymentMethod);

    const created = await prisma.subscription.create({
      data: {
        userId: owner.id,
        tier: productTierToStoredTier(payload.tier),
        status: SubscriptionStatus.unpaid,
        amountRwf: plan.priceRwf,
        paymentMethod,
        externalRef: reference,
        startsAt: new Date(),
      },
    });

    const gatewayResponse = await initiateFlutterwaveCharge({
      phoneNumber: payload.mobileNumber,
      amount: plan.priceRwf,
      currency: 'RWF',
      email: owner.email,
      txRef: reference,
      fullName: owner.fullName,
    });

    return {
      subscriptionId: created.id,
      reference,
      status: 'pending_payment',
      tier: payload.tier,
      amountRwf: plan.priceRwf,
      paymentMethod: payload.paymentMethod,
      providerResponse: gatewayResponse,
      redirectUrl: gatewayResponse.meta?.authorization?.redirect,
    };
  }

  async handleFlutterwaveWebhook(body: unknown, verifHash?: string) {
    this.verifyFlutterwaveWebhook(verifHash);
    const payload = this.getRecord(body);
    if (!payload) {
      throw new BadRequestException('Webhook payload must be a JSON object.');
    }
    const event = this.getString(payload.event);
    if (event !== 'charge.completed') {
      return { ok: true, processed: false, reason: `Ignoring event: ${event}` };
    }
    const data = this.getRecord(payload.data);
    if (!data) {
      throw new BadRequestException('Webhook data is missing.');
    }
    const reference = this.getString(data.tx_ref);
    const status = this.getString(data.status);
    if (!reference) {
      throw new BadRequestException('Webhook payload does not include tx_ref.');
    }
    if (!this.isSuccessStatus(status ?? '')) {
      return {
        ok: true,
        processed: false,
        reason: 'Payment not successful.',
        reference,
        status: status ?? 'unknown',
      };
    }
    return this.processSuccessfulPayment(reference);
  }

  async getMine(authUser: AuthenticatedUser) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const now = new Date();

    const [effectivePublishSubscription, latestSubscription, activeListingCount] = await Promise.all([
      this.findEffectivePublishSubscription(owner.id, now),
      prisma.subscription.findFirst({
        where: { userId: owner.id, tier: { not: 'free' } },
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
        renewsAt: selected.renewsAt,
        amountRwf: selected.amountRwf,
        paymentMethod: selected.paymentMethod,
      },
      activeCars: activeListingCount,
      maxCars: plan.maxCars,
      canPublish,
    };
  }

  async upgrade(authUser: AuthenticatedUser, payload: UpgradeSubscriptionDto) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const targetPlan = getTierPlan(payload.tier);
    const existing = await prisma.subscription.findFirst({
      where: {
        userId: owner.id,
        status: SubscriptionStatus.active,
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
            status: SubscriptionStatus.active,
            id: { not: activatedSubscription.id },
          },
          data: {
            status: SubscriptionStatus.expired,
            endsAt: now,
          },
        });

        await this.pauseExcessListingsForTier(tx, owner.id, payload.tier);
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
    const created = await prisma.subscription.create({
      data: {
        userId: owner.id,
        tier: productTierToStoredTier(payload.tier),
        status: SubscriptionStatus.unpaid,
        amountRwf: amountToCharge,
        paymentMethod,
        externalRef: reference,
        startsAt: new Date(),
      },
    });

    const gatewayResponse = await initiateFlutterwaveCharge({
      phoneNumber: payload.mobileNumber,
      amount: amountToCharge,
      currency: 'RWF',
      email: owner.email,
      txRef: reference,
      fullName: owner.fullName,
    });

    return {
      subscriptionId: created.id,
      reference,
      status: 'pending_payment',
      tier: payload.tier,
      amountRwf: amountToCharge,
      paymentMethod: payload.paymentMethod,
      providerResponse: gatewayResponse,
      redirectUrl: gatewayResponse.meta?.authorization?.redirect,
    };
  }

  async cancel(authUser: AuthenticatedUser) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const active = await prisma.subscription.findFirst({
      where: {
        userId: owner.id,
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

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendRenewalRemindersCron() {
    await this.sendRenewalReminders();
  }

  async enforceCancelledRenewals(now: Date = new Date()) {
    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
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

      await tx.subscription.updateMany({
        where: {
          userId: subscription.userId,
          tier: subscription.tier,
          status: SubscriptionStatus.active,
          id: { not: subscription.id },
        },
        data: {
          status: SubscriptionStatus.expired,
          endsAt: now,
        },
      });

      if (subscription.tier !== 'free') {
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
      where: { userId: owner.id, tier: { not: 'free' } },
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
      where: { userId: driver.id, tier: 'free' },
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
    const reference = randomUUID();
    const paymentMethod = this.mapDtoMethod(payload.paymentMethod);

    const created = await prisma.subscription.create({
      data: {
        userId: driver.id,
        tier: 'free',
        status: SubscriptionStatus.unpaid,
        amountRwf: DRIVER_PLAN.priceRwf,
        paymentMethod,
        externalRef: reference,
        startsAt: new Date(),
      },
    });

    const gatewayResponse = await initiateFlutterwaveCharge({
      phoneNumber: payload.mobileNumber,
      amount: DRIVER_PLAN.priceRwf,
      currency: 'RWF',
      email: driver.email,
      txRef: reference,
      fullName: driver.fullName,
    });

    return {
      subscriptionId: created.id,
      reference,
      status: 'pending_payment',
      amountRwf: DRIVER_PLAN.priceRwf,
      paymentMethod: payload.paymentMethod,
      providerResponse: gatewayResponse,
      redirectUrl: gatewayResponse.meta?.authorization?.redirect,
    };
  }

  async getDriverSubscriptionMine(authUser: AuthenticatedUser) {
    const driver = await this.requireDriver(authUser.clerkUserId);
    const now = new Date();

    const effective = await prisma.subscription.findFirst({
      where: {
        userId: driver.id,
        tier: 'free',
        OR: [{ status: SubscriptionStatus.active }, { status: SubscriptionStatus.cancelled, renewsAt: { gt: now } }],
      },
      orderBy: { startsAt: 'desc' },
    });

    const latest = effective ?? await prisma.subscription.findFirst({
      where: { userId: driver.id, tier: 'free' },
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
        tier: 'free',
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

  private verifyFlutterwaveWebhook(verifHash?: string) {
    const secret = process.env.FLW_WEBHOOK_SECRET;
    if (!secret) {
      throw new BadRequestException('Flutterwave webhook secret is not configured.');
    }
    if (!verifHash || verifHash.trim() !== secret.trim()) {
      throw new BadRequestException('Invalid Flutterwave webhook signature.');
    }
  }

  private async findEffectivePublishSubscription(userId: string, now: Date) {
    return prisma.subscription.findFirst({
      where: {
        userId,
        tier: { not: 'free' },
        OR: [{ status: SubscriptionStatus.active }, { status: SubscriptionStatus.cancelled, renewsAt: { gt: now } }],
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

  private isSuccessStatus(status: string): boolean {
    const normalized = status.trim().toLowerCase();
    return (
      normalized === 'successful' ||
      normalized === 'success' ||
      normalized === 'succeeded' ||
      normalized === 'completed' ||
      normalized === 'paid' ||
      normalized === 'approved'
    );
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
        return 'pending_payment';
      default:
        return status;
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

  private getRecord(value: unknown): JsonRecord | undefined {
    return typeof value === 'object' && value !== null ? (value as JsonRecord) : undefined;
  }

  private getString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }
}

