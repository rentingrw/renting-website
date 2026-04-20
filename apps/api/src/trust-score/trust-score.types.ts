import { TrustEventType } from '@prisma/client';

export type TrustDeltaEventType =
  | 'booking_complete'
  | 'review_left'
  | 'five_star_received'
  | 'on_time'
  | 'no_show'
  | 'late_pickup'
  | 'not_as_described'
  | 'damage'
  | 'no_response_1h'
  | 'cancel_lt_24h';

export interface TrustEventInput {
  userId: string;
  eventType: TrustDeltaEventType;
  reason?: string;
  carBookingId?: string;
  driverBookingId?: string;
  metadata?: Record<string, unknown>;
}

export interface ResolvedTrustEvent {
  type: TrustEventType;
  delta: number;
  reason: string;
}
