import { SubscriptionTier } from './enums';

export interface BookingNewRequestPayload {
  bookingId: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
}

export interface BookingConfirmedPayload {
  bookingId: string;
  ownerId: string;
  renterId: string;
  confirmedAt: string;
}

export interface BookingDeclinedPayload {
  bookingId: string;
  ownerId: string;
  renterId: string;
  reason?: string;
}

export interface BookingAutoCancelledPayload {
  bookingId: string;
  cancelledAt: string;
  reason: string;
}

export interface MessageNewPayload {
  messageId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export interface BookingMarkCompleteReceivedPayload {
  bookingId: string;
  markedBy: string;
  completedAt: string;
}

export interface ReviewPromptPayload {
  bookingId: string;
  fromUserId: string;
  toUserId: string;
}

export interface TrustScoreUpdatedPayload {
  userId: string;
  trustScore: number;
  delta: number;
}

export interface SubscriptionActivatedPayload {
  subscriptionId: string;
  userId: string;
  tier: SubscriptionTier;
  activatedAt: string;
}

export interface DisputeOpenedPayload {
  disputeId: string;
  openedById: string;
  againstUserId: string;
  reason: string;
}

export type SocketEvents = {
  'booking.new_request': BookingNewRequestPayload;
  'booking.confirmed': BookingConfirmedPayload;
  'booking.declined': BookingDeclinedPayload;
  'booking.auto_cancelled': BookingAutoCancelledPayload;
  'message.new': MessageNewPayload;
  'booking.mark_complete_received': BookingMarkCompleteReceivedPayload;
  'review.prompt': ReviewPromptPayload;
  'trust_score.updated': TrustScoreUpdatedPayload;
  'subscription.activated': SubscriptionActivatedPayload;
  'dispute.opened': DisputeOpenedPayload;
};
