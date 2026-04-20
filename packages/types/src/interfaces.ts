import {
  BookingStatus,
  DisputeStatus,
  DriverCategory,
  Language,
  ListingStatus,
  PaymentMethod,
  RoleType,
  ServiceType,
  SubscriptionStatus,
  SubscriptionTier,
  TrustEventType,
  UserStatus,
  VehicleType,
} from './enums';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface IUser {
  id: string;
  clerkId?: string | null;
  email: string;
  phone?: string | null;
  fullName: string;
  avatarUrl?: string | null;
  status: UserStatus;
  primaryRole: RoleType;
  trustScore: number;
  languagePreference: Language;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IUserRole {
  id: string;
  userId: string;
  role: RoleType;
  createdAt: Date;
}

export interface ICarOwnerProfile {
  id: string;
  userId: string;
  companyName?: string | null;
  nationalIdNumber?: string | null;
  tinNumber?: string | null;
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDriverProfile {
  id: string;
  userId: string;
  driverCategory: DriverCategory;
  yearsExperience: number;
  biography?: string | null;
  dailyRateRwf: string;
  hourlyRateRwf?: string | null;
  languages: Language[];
  categories: DriverCategory[];
  vehicleTypes: VehicleType[];
  certifications: string[];
  serviceAreas: string[];
  availabilityCalendar: unknown;
  rating?: string | null;
  completedTrips: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICarListing {
  id: string;
  ownerId: string;
  title: string;
  description?: string | null;
  vehicleType: VehicleType;
  serviceType: ServiceType;
  brand: string;
  model: string;
  year: number;
  seats: number;
  transmission?: string | null;
  fuelType?: string | null;
  dailyRateKigaliRwf: number;
  dailyRateCountrysideRwf: number;
  locationText: string;
  pickupLocation?: GeoPoint | null;
  photos: string[];
  features: string[];
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICarBooking {
  id: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  startDate: Date;
  endDate: Date;
  pickupAddress: string;
  pickupLocation?: GeoPoint | null;
  totalAmountRwf: number;
  paymentMethod?: PaymentMethod | null;
  status: BookingStatus;
  renterMarkedComplete: boolean;
  ownerMarkedComplete: boolean;
  notes?: string | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDriverBooking {
  id: string;
  driverId: string;
  renterId: string;
  serviceType: ServiceType;
  startAt: Date;
  endAt: Date;
  pickupAddress: string;
  dropoffAddress?: string | null;
  pickupLocation?: GeoPoint | null;
  totalAmountRwf: number;
  paymentMethod?: PaymentMethod | null;
  status: BookingStatus;
  driverMarkedComplete: boolean;
  clientMarkedComplete: boolean;
  notes?: string | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITrustScoreEvent {
  id: string;
  userId: string;
  type: TrustEventType;
  carBookingId?: string | null;
  driverBookingId?: string | null;
  delta: number;
  reason: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface IReview {
  id: string;
  fromUserId: string;
  toUserId: string;
  carBookingId?: string | null;
  driverBookingId?: string | null;
  rating: number;
  comment?: string | null;
  createdAt: Date;
}

export interface ISubscription {
  id: string;
  userId: string;
  carOwnerProfileId?: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  amountRwf: number;
  paymentMethod?: PaymentMethod | null;
  externalRef?: string | null;
  startsAt: Date;
  renewsAt?: Date | null;
  endsAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  id: string;
  senderId: string;
  receiverId: string;
  carBookingId?: string | null;
  driverBookingId?: string | null;
  content: string;
  readAt?: Date | null;
  createdAt: Date;
}

export interface IDispute {
  id: string;
  openedById: string;
  againstUserId: string;
  carBookingId?: string | null;
  driverBookingId?: string | null;
  reason: string;
  description?: string | null;
  status: DisputeStatus;
  resolutionNote?: string | null;
  adminNotes?: string | null;
  resolvedById?: string | null;
  createdAt: Date;
  resolvedAt?: Date | null;
}
