import { BadRequestException } from '@nestjs/common';
import { Prisma, type PromoCode, SubscriptionKind } from '@prisma/client';

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export function applyPromoAmount(
  priceRwf: number,
  promo: Pick<PromoCode, 'discountPercent' | 'discountRwf'> | null,
): { amountRwf: number; waived: boolean } {
  if (!promo) {
    return { amountRwf: priceRwf, waived: false };
  }

  let amount = priceRwf;
  if (promo.discountPercent != null) {
    amount = Math.round((priceRwf * (100 - promo.discountPercent)) / 100);
  } else if (promo.discountRwf != null) {
    amount = priceRwf - promo.discountRwf;
  }

  const amountRwf = Math.max(0, amount);
  return { amountRwf, waived: amountRwf === 0 };
}

export function assertPromoUsable(
  promo: PromoCode,
  kind: SubscriptionKind,
  now: Date = new Date(),
): void {
  if (!promo.isActive) {
    throw new BadRequestException('This promo code is no longer active.');
  }
  if (promo.kind && promo.kind !== kind) {
    throw new BadRequestException('This promo code does not apply to this plan.');
  }
  if (promo.startsAt && promo.startsAt > now) {
    throw new BadRequestException('This promo code is not active yet.');
  }
  if (promo.endsAt && promo.endsAt < now) {
    throw new BadRequestException('This promo code has expired.');
  }
  if (promo.maxRedemptions != null && promo.redemptionCount >= promo.maxRedemptions) {
    throw new BadRequestException('This promo code has reached its redemption limit.');
  }
}

export async function incrementPromoRedemption(
  tx: Prisma.TransactionClient,
  promoId: string,
): Promise<void> {
  await tx.promoCode.update({
    where: { id: promoId },
    data: { redemptionCount: { increment: 1 } },
  });
}
