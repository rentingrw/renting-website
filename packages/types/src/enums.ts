export enum UserStatus {
  active = 'active',
  pending_verification = 'pending_verification',
  suspended = 'suspended',
  deactivated = 'deactivated',
  banned = 'banned',
}

export enum RoleType {
  renter = 'renter',
  car_owner = 'car_owner',
  driver = 'driver',
}

export enum ListingStatus {
  draft = 'draft',
  pending_approval = 'pending_approval',
  active = 'active',
  paused = 'paused',
  rejected = 'rejected',
  deleted = 'deleted',
  archived = 'archived',
}

export enum BookingStatus {
  pending = 'pending',
  confirmed = 'confirmed',
  declined = 'declined',
  auto_cancelled = 'auto_cancelled',
  overlap_declined = 'overlap_declined',
  cancelled_by_renter = 'cancelled_by_renter',
  cancelled_by_owner = 'cancelled_by_owner',
  cancelled_admin = 'cancelled_admin',
  active = 'active',
  completed = 'completed',
  auto_completed = 'auto_completed',
  disputed = 'disputed',
}

export enum SubscriptionTier {
  free = 'free',
  standard = 'standard',
  premium = 'premium',
  business = 'business',
}

export enum SubscriptionStatus {
  trialing = 'trialing',
  active = 'active',
  cancelled = 'cancelled',
  expired = 'expired',
  past_due = 'past_due',
  unpaid = 'unpaid',
  draft = 'draft',
  pending_payment = 'pending_payment',
  suspended = 'suspended',
}

export enum SubscriptionKind {
  hoster = 'hoster',
  driver = 'driver',
  taxi = 'taxi',
}

export enum PaymentMethod {
  momo = 'momo',
  airtel_money = 'airtel_money',
  card = 'card',
  bank_transfer = 'bank_transfer',
  cash = 'cash',
  wallet = 'wallet',
}

export enum TrustEventType {
  booking_completed_positive = 'booking_completed_positive',
  booking_cancelled_negative = 'booking_cancelled_negative',
  review_received = 'review_received',
  review_flagged = 'review_flagged',
  dispute_opened = 'dispute_opened',
  dispute_resolved = 'dispute_resolved',
  profile_verified = 'profile_verified',
  admin_adjustment = 'admin_adjustment',
}

export enum DisputeStatus {
  open = 'open',
  under_review = 'under_review',
  waiting_evidence = 'waiting_evidence',
  resolved = 'resolved',
  rejected = 'rejected',
  escalated = 'escalated',
}

export enum DriverCategory {
  city = 'city',
  outstation = 'outstation',
  airport = 'airport',
  chauffeur = 'chauffeur',
  tour_guide = 'tour_guide',
  delivery = 'delivery',
}

export enum Language {
  en = 'en',
  rw = 'rw',
  fr = 'fr',
  sw = 'sw',
}

export enum ServiceType {
  self_drive = 'self_drive',
  with_driver = 'with_driver',
  private_driver = 'private_driver',
  airport_transfer = 'airport_transfer',
  corporate = 'corporate',
}

export enum VehicleType {
  sedan = 'sedan',
  suv = 'suv',
  hatchback = 'hatchback',
  pickup = 'pickup',
  van = 'van',
  truck = 'truck',
}
