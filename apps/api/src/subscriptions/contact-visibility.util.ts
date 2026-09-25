import { BookingStatus, SubscriptionKind, SubscriptionTier } from '@prisma/client';

import { getHosterBenefits, type ProductTier } from './subscription-tier.util';

export type ContactVisibility = {
  publicContact: boolean;
  instantBooking: boolean;
  verified: boolean;
  locationBoost: boolean;
};

const CONFIRMED_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.confirmed,
  BookingStatus.active,
  BookingStatus.completed,
  BookingStatus.auto_completed,
];

export function isConfirmedBookingStatus(status: BookingStatus): boolean {
  return CONFIRMED_BOOKING_STATUSES.includes(status);
}

export function getContactVisibility(params: {
  kind: SubscriptionKind;
  storedTier?: SubscriptionTier | null;
  productTier?: ProductTier | null;
  bookingConfirmed?: boolean;
}): ContactVisibility {
  if (params.kind === SubscriptionKind.taxi) {
    return {
      publicContact: true,
      instantBooking: true,
      verified: false,
      locationBoost: false,
    };
  }

  if (params.kind === SubscriptionKind.driver) {
    return {
      publicContact: Boolean(params.bookingConfirmed),
      instantBooking: false,
      verified: false,
      locationBoost: false,
    };
  }

  const benefits = params.storedTier
    ? getHosterBenefits(params.storedTier)
    : params.productTier
      ? getHosterBenefits(
          params.productTier === 'enterprise'
            ? SubscriptionTier.business
            : params.productTier === 'premium'
              ? SubscriptionTier.premium
              : SubscriptionTier.standard,
        )
      : {
          maxCars: 0,
          locationBoost: false,
          verified: false,
          instantBooking: false,
          publicContact: false,
        };

  return {
    publicContact: benefits.publicContact || Boolean(params.bookingConfirmed),
    instantBooking: benefits.instantBooking,
    verified: benefits.verified,
    locationBoost: benefits.locationBoost,
  };
}
