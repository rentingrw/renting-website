import { SubscriptionTier } from '@prisma/client';

export type ProductTier = 'basic' | 'premium' | 'enterprise';

export type TierPlan = {
  tier: ProductTier;
  priceRwf: number;
  maxCars: number | null;
};

export const DRIVER_PLAN = {
  priceRwf: 10_000,
} as const;

const PLAN_BY_TIER: Record<ProductTier, TierPlan> = {
  basic: { tier: 'basic', priceRwf: 10_000, maxCars: 1 },
  premium: { tier: 'premium', priceRwf: 30_000, maxCars: 5 },
  enterprise: { tier: 'enterprise', priceRwf: 60_000, maxCars: null },
};

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

