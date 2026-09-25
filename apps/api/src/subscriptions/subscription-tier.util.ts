import { SubscriptionKind, SubscriptionStatus, SubscriptionTier } from '@prisma/client';

export type ProductTier = 'basic' | 'premium' | 'enterprise';

export type HosterPlanBenefits = {
  maxCars: number | null;
  locationBoost: boolean;
  verified: boolean;
  instantBooking: boolean;
  publicContact: boolean;
};

export type TierPlan = {
  tier: ProductTier;
  label: string;
  priceRwf: number;
} & HosterPlanBenefits;

export const DRIVER_PLAN = {
  kind: 'driver' as const,
  priceRwf: 10_000,
  label: 'Driver',
} as const;

export const TAXI_PLAN = {
  kind: 'taxi' as const,
  priceRwf: 10_000,
  label: 'Taxi',
} as const;

const PLAN_BY_TIER: Record<ProductTier, TierPlan> = {
  basic: {
    tier: 'basic',
    label: 'Basic',
    priceRwf: 10_000,
    maxCars: 1,
    locationBoost: false,
    verified: false,
    instantBooking: false,
    publicContact: false,
  },
  premium: {
    tier: 'premium',
    label: 'Premium',
    priceRwf: 25_000,
    maxCars: 5,
    locationBoost: true,
    verified: false,
    instantBooking: false,
    publicContact: false,
  },
  enterprise: {
    tier: 'enterprise',
    label: 'Extra Premium',
    priceRwf: 50_000,
    maxCars: null,
    locationBoost: true,
    verified: true,
    instantBooking: true,
    publicContact: true,
  },
};

export const HOSTER_PLANS = Object.values(PLAN_BY_TIER);

export function productTierToStoredTier(tier: ProductTier): SubscriptionTier {
  switch (tier) {
    case 'enterprise':
      return SubscriptionTier.business;
    case 'premium':
      return SubscriptionTier.premium;
    case 'basic':
    default:
      return SubscriptionTier.standard;
  }
}

export function storedTierToProductTier(tier: SubscriptionTier): ProductTier {
  switch (tier) {
    case SubscriptionTier.business:
      return 'enterprise';
    case SubscriptionTier.premium:
      return 'premium';
    case SubscriptionTier.free:
    case SubscriptionTier.standard:
    default:
      return 'basic';
  }
}

export function getTierPlan(tier: ProductTier): TierPlan {
  return PLAN_BY_TIER[tier];
}

export function getHosterBenefits(tier: SubscriptionTier): HosterPlanBenefits {
  return getTierPlan(storedTierToProductTier(tier));
}

export const LIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.active,
  SubscriptionStatus.cancelled,
];

export function liveSubscriptionWhere(kind: SubscriptionKind, now: Date = new Date()) {
  return {
    kind,
    status: { in: LIVE_SUBSCRIPTION_STATUSES },
    OR: [{ renewsAt: null }, { renewsAt: { gt: now } }],
  };
}
