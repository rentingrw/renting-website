export const realtimeEvents = {
  bookingNewRequest: 'booking:new_request',
  bookingConfirmed: 'booking:confirmed',
  bookingDeclined: 'booking:declined',
  bookingCancelledAdmin: 'booking:cancelled_admin',
  bookingAutoCancelled: 'booking:auto_cancelled',
  bookingOverlapDeclined: 'booking:overlap_declined',
  messageNew: 'message:new',
  bookingMarkCompleteReceived: 'booking:mark_complete_received',
  reviewPrompt: 'review:prompt',
  trustScoreUpdated: 'trust_score:updated',
  subscriptionActivated: 'subscription:activated',
  disputeOpened: 'dispute:opened',
  disputeResolved: 'dispute:resolved',
  listingApproved: 'listing:approved',
  listingRejected: 'listing:rejected',
} as const;

export type RealtimeEventName = (typeof realtimeEvents)[keyof typeof realtimeEvents];
