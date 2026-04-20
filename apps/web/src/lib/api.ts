'use client';

import type { SupportedLocale } from '@/i18n/routing';

export type AppRole = 'renter' | 'car_owner' | 'driver';
export type SearchType = 'all' | 'cars' | 'drivers';
export type ServiceType = 'self_drive' | 'with_driver' | 'private_driver' | 'airport_transfer' | 'corporate';
export type VehicleType = 'sedan' | 'suv' | 'hatchback' | 'pickup' | 'van' | 'truck';
export type DriverCategory = 'city' | 'outstation' | 'airport' | 'chauffeur' | 'tour_guide' | 'delivery';

type PriceRange = {
  min: number;
  max: number;
};

export type MeResponse = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  primaryRole: AppRole;
  languagePreference: string;
  roles: AppRole[];
};

type SyncPayload = {
  email: string;
  phone?: string;
  fullName: string;
  profilePhotoUrl?: string;
  primaryRole: AppRole;
  languagePreference?: SupportedLocale;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type SearchCar = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  vehicleType: VehicleType;
  serviceType: ServiceType;
  brand: string;
  model: string;
  year: number;
  seats: number;
  transmission: string | null;
  fuelType: string | null;
  locationText: string;
  photos: string[];
  features: string[];
  distanceMeters: number | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dailyRateKigaliRwf?: number;
  dailyRateCountrysideRwf?: number;
  approximateDailyRateRangeRwf?: {
    kigali: PriceRange;
    countryside: PriceRange;
  };
};

export type SearchDriver = {
  id: string;
  userId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  trustScore: number;
  driverCategory: DriverCategory;
  yearsExperience: number;
  biography: string | null;
  primaryCity: string;
  languages: string[];
  categories: string[];
  vehicleTypes: string[];
  certifications: string[];
  serviceAreas: string[];
  rating: number | null;
  completedTrips: number;
  distanceMeters: number | null;
  primaryCityLatitude?: number | null;
  primaryCityLongitude?: number | null;
  dailyRateRwf?: number;
  hourlyRateRwf?: number | null;
  weeklyRateRwf?: number | null;
  approximateRateRangeRwf?: {
    daily: PriceRange;
    hourly?: PriceRange;
    weekly?: PriceRange;
  };
};

export type SearchResponse = {
  type: SearchType;
  cars: SearchCar[];
  drivers: SearchDriver[];
  pagination?: {
    limit: number;
    offset: number;
    hasMoreCars: boolean;
    hasMoreDrivers: boolean;
  };
};

export type CarDetail = {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string | null;
  vehicleType: VehicleType;
  serviceType: ServiceType;
  brand: string;
  model: string;
  year: number;
  seats: number;
  transmission: string | null;
  fuelType: string | null;
  locationText: string;
  photos: string[];
  features: string[];
  dailyRateKigaliRwf?: number;
  dailyRateCountrysideRwf?: number;
  approximateDailyRateRangeRwf?: {
    kigali: PriceRange;
    countryside: PriceRange;
  };
};

export type DriverDetail = {
  id: string;
  userId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  trustScore: number;
  driverCategory: DriverCategory;
  yearsExperience: number;
  biography: string | null;
  primaryCity: string;
  languages: string[];
  categories: string[];
  vehicleTypes: string[];
  certifications: string[];
  serviceAreas: string[];
  rating: number | null;
  completedTrips: number;
  dailyRateRwf?: number;
  hourlyRateRwf?: number | null;
  weeklyRateRwf?: number | null;
  approximateRateRangeRwf?: {
    daily: PriceRange;
    hourly?: PriceRange;
    weekly?: PriceRange;
  };
};

export type CarAvailabilityResponse = {
  listingId: string;
  month: string;
  bookedRanges: Array<{
    bookingId: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
};

type SearchQuery = {
  type?: SearchType;
  query?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  offset?: number;
  from?: string;
  to?: string;
  serviceType?: ServiceType;
  vehicleType?: VehicleType;
  driverCategory?: DriverCategory;
  limit?: number;
};

type CarBookingPayload = {
  listingId: string;
  startDate: string;
  endDate: string;
  pickupAddress: string;
  totalAmountRwf: number;
  notes?: string;
};

type DriverBookingPayload = {
  driverId: string;
  serviceType: ServiceType;
  startAt: string;
  endAt: string;
  pickupAddress: string;
  dropoffAddress?: string;
  totalAmountRwf: number;
  notes?: string;
};

type BookingType = 'car' | 'driver';

type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'auto_completed'
  | 'declined'
  | 'overlap_declined'
  | 'auto_cancelled'
  | 'cancelled_by_renter'
  | 'cancelled_by_owner'
  | 'disputed';

type BookingParty = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
};

type BookingDispute = {
  id: string;
  status: string;
  reason: string;
};

type ListingSummary = {
  id: string;
  title: string;
  photos: string[];
};

export type CarBooking = {
  id: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  pickupAddress: string;
  totalAmountRwf: number;
  notes: string | null;
  status: BookingStatus;
  renterMarkedComplete: boolean;
  ownerMarkedComplete: boolean;
  chatEligible: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  listing: ListingSummary;
  owner: BookingParty;
  renter: BookingParty;
  disputes: BookingDispute[];
};

export type DriverBooking = {
  id: string;
  driverId: string;
  renterId: string;
  serviceType: ServiceType;
  startAt: string;
  endAt: string;
  pickupAddress: string;
  dropoffAddress: string | null;
  totalAmountRwf: number;
  notes: string | null;
  status: BookingStatus;
  clientMarkedComplete: boolean;
  driverMarkedComplete: boolean;
  chatEligible: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  driver: BookingParty;
  renter: BookingParty;
  disputes: BookingDispute[];
};

export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  sender: BookingParty;
  receiver: BookingParty;
};

export type OwnerCar = {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string | null;
  vehicleType: VehicleType;
  serviceType: ServiceType;
  brand: string;
  model: string;
  year: number;
  seats: number;
  transmission: string | null;
  fuelType: string | null;
  locationText: string;
  status: 'draft' | 'active' | 'paused' | 'deleted' | 'archived';
  dailyRateKigaliRwf: number;
  dailyRateCountrysideRwf: number;
  photos: string[];
  features: string[];
  bookingCounts: {
    total: number;
    pending: number;
    confirmed: number;
    active: number;
  };
};

export type CarListingPayload = {
  title: string;
  description?: string;
  vehicleType: VehicleType;
  serviceType: ServiceType;
  brand: string;
  model: string;
  year: number;
  seats: number;
  transmission?: string;
  fuelType?: string;
  dailyRateKigaliRwf: number;
  dailyRateCountrysideRwf: number;
  locationText: string;
  latitude?: number;
  longitude?: number;
  photos: string[];
  features: string[];
};

export type SubscriptionOverview = {
  subscription: null | {
    id: string;
    status: string;
    tier: 'basic' | 'premium' | 'enterprise';
    renewsAt: string | null;
    amountRwf: number;
    paymentMethod: string;
  };
  activeCars: number;
  maxCars: number | null;
  canPublish: boolean;
};

export type DriverProfileMe = {
  id: string;
  userId: string;
  fullName: string;
  trustScore: number;
  categories: string[];
  bookingStats: {
    pending: number;
    active: number;
    completed: number;
  };
};

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function getMe(token: string): Promise<MeResponse | null> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to load user profile.');
  }

  return (await response.json()) as MeResponse;
}

export async function syncUser(token: string, payload: SyncPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      phone: payload.phone,
      fullName: payload.fullName,
      profilePhotoUrl: payload.profilePhotoUrl,
      primaryRole: payload.primaryRole,
      languagePreference: payload.languagePreference,
    }),
  });

  if (response.ok) {
    return;
  }

  const errorPayload = (await parseJson(response)) as { message?: string | string[] } | null;
  let detail = 'Failed to sync user.';
  if (errorPayload && typeof errorPayload === 'object' && errorPayload.message) {
    const msg = errorPayload.message;
    detail = Array.isArray(msg) ? msg.join('. ') : String(msg);
  }

  throw new Error(detail);
}

export async function updateMe(
  token: string,
  payload: { fullName?: string; profilePhotoUrl?: string; languagePreference?: string },
): Promise<MeResponse> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await ensureOk(response, 'Failed to update profile.');
  return (await response.json()) as MeResponse;
}

export async function addRole(token: string, role: AppRole): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/me/roles`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  await ensureOk(response, 'Failed to add role.');
}

export async function patchLanguagePreference(
  token: string,
  languagePreference: SupportedLocale,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language_preference: languagePreference,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update language preference.');
  }
}

function buildQueryString(query: SearchQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

function authHeaders(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function searchMarketplace(query: SearchQuery, token?: string): Promise<SearchResponse> {
  const qs = buildQueryString(query);
  const response = await fetch(`${API_BASE_URL}/search${qs ? `?${qs}` : ''}`, {
    headers: {
      ...authHeaders(token),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = 'Failed to load search results.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body?.message) {
        message = Array.isArray(body.message) ? body.message.join('. ') : String(body.message);
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  return (await response.json()) as SearchResponse;
}

export async function getCarById(id: string, token?: string): Promise<CarDetail> {
  const response = await fetch(`${API_BASE_URL}/cars/${id}`, {
    headers: {
      ...authHeaders(token),
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to load car details.');
  }
  return (await response.json()) as CarDetail;
}

export type ReviewItem = {
  id: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  fromUser: { id: string; fullName: string; avatarUrl: string | null };
};

export type ReviewsForUserResponse = {
  userId: string;
  averageRating: number | null;
  totalReviews: number;
  reviews: ReviewItem[];
};

export async function getReviewsForUser(userId: string): Promise<ReviewsForUserResponse> {
  const response = await fetch(`${API_BASE_URL}/reviews/user/${userId}`);
  await ensureOk(response, 'Failed to load reviews.');
  return response.json() as Promise<ReviewsForUserResponse>;
}

export async function getDriverById(id: string, token?: string): Promise<DriverDetail> {
  const response = await fetch(`${API_BASE_URL}/drivers/${id}`, {
    headers: {
      ...authHeaders(token),
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to load driver details.');
  }
  return (await response.json()) as DriverDetail;
}

export async function getCarAvailability(id: string, month: string): Promise<CarAvailabilityResponse> {
  const response = await fetch(`${API_BASE_URL}/cars/${id}/availability?month=${encodeURIComponent(month)}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to load availability.');
  }
  return (await response.json()) as CarAvailabilityResponse;
}

export async function createCarBooking(token: string, payload: CarBookingPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to create booking request.');
  }
}

export async function createDriverBooking(token: string, payload: DriverBookingPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/driver-bookings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    await ensureOk(response, 'Failed to create driver booking request.');
  }
}

async function ensureOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) {
    return;
  }
  const payload = await parseJson(response);
  const raw =
    typeof payload === 'object' && payload !== null && 'message' in payload ? (payload as { message?: unknown }).message : undefined;
  const detail =
    typeof raw === 'string'
      ? raw
      : Array.isArray(raw) && raw.length > 0
        ? raw.join('. ')
        : fallbackMessage;
  throw new Error(detail);
}

export async function getCarBookingsMine(token: string): Promise<CarBooking[]> {
  const response = await fetch(`${API_BASE_URL}/bookings/mine`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  await ensureOk(response, 'Failed to load car bookings.');
  return (await response.json()) as CarBooking[];
}

export async function getDriverBookingsMine(token: string): Promise<DriverBooking[]> {
  const response = await fetch(`${API_BASE_URL}/driver-bookings/mine`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  await ensureOk(response, 'Failed to load driver bookings.');
  return (await response.json()) as DriverBooking[];
}

async function postBookingAction(
  token: string,
  endpoint: string,
  fallbackMessage: string,
  body?: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  await ensureOk(response, fallbackMessage);
}

export async function confirmBooking(token: string, bookingType: BookingType, bookingId: string): Promise<void> {
  const prefix = bookingType === 'car' ? 'bookings' : 'driver-bookings';
  await postBookingAction(token, `/${prefix}/${bookingId}/confirm`, 'Failed to confirm booking.');
}

export async function declineBooking(token: string, bookingType: BookingType, bookingId: string): Promise<void> {
  const prefix = bookingType === 'car' ? 'bookings' : 'driver-bookings';
  await postBookingAction(token, `/${prefix}/${bookingId}/decline`, 'Failed to decline booking.');
}

export async function cancelBooking(token: string, bookingType: BookingType, bookingId: string): Promise<void> {
  const prefix = bookingType === 'car' ? 'bookings' : 'driver-bookings';
  await postBookingAction(token, `/${prefix}/${bookingId}/cancel`, 'Failed to cancel booking.');
}

export async function markBookingComplete(token: string, bookingType: BookingType, bookingId: string): Promise<void> {
  const prefix = bookingType === 'car' ? 'bookings' : 'driver-bookings';
  await postBookingAction(token, `/${prefix}/${bookingId}/mark-complete`, 'Failed to mark booking complete.');
}

export async function flagBookingIssue(
  token: string,
  bookingType: BookingType,
  bookingId: string,
  reason: string,
): Promise<void> {
  const prefix = bookingType === 'car' ? 'bookings' : 'driver-bookings';
  await postBookingAction(token, `/${prefix}/${bookingId}/flag-issue`, 'Failed to flag issue.', {
    reason,
  });
}

export async function getBookingMessages(
  token: string,
  bookingType: BookingType,
  bookingId: string,
): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/messages/${bookingType}/${bookingId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  await ensureOk(response, 'Failed to load chat history.');
  return (await response.json()) as ChatMessage[];
}

export async function sendBookingMessage(
  token: string,
  payload: {
    bookingType: BookingType;
    bookingId: string;
    content: string;
  },
): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  await ensureOk(response, 'Failed to send message.');
  return (await response.json()) as ChatMessage;
}

export async function markConversationRead(
  token: string,
  bookingType: BookingType,
  bookingId: string,
): Promise<void> {
  await fetch(`${API_BASE_URL}/messages/${bookingType}/${bookingId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getUnreadMessageCount(token: string): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/messages/unread/count`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return 0;
  const data = (await response.json()) as { unread: number };
  return data.unread;
}

export async function createReview(
  token: string,
  payload: {
    toUserId: string;
    rating: number;
    comment?: string;
    carBookingId?: string;
    driverBookingId?: string;
  },
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/reviews`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  await ensureOk(response, 'Failed to submit review.');
}

export async function getCarsMine(token: string): Promise<OwnerCar[]> {
  const response = await fetch(`${API_BASE_URL}/cars/mine`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  await ensureOk(response, 'Failed to load your cars.');
  return (await response.json()) as OwnerCar[];
}

export async function publishCar(token: string, carId: string): Promise<void> {
  await postBookingAction(token, `/cars/${carId}/publish`, 'Failed to publish car.');
}

export async function pauseCar(token: string, carId: string): Promise<void> {
  await postBookingAction(token, `/cars/${carId}/pause`, 'Failed to pause car.');
}

export type CarUploadUrlResponse = {
  uploadUrl: string;
  fields: { api_key: string; timestamp: number; folder: string; signature: string };
};

export async function getCarUploadUrl(token: string, folder?: string): Promise<CarUploadUrlResponse> {
  const response = await fetch(`${API_BASE_URL}/cars/upload-url`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(folder ? { folder } : {}),
  });
  await ensureOk(response, 'Failed to get upload URL.');
  return response.json() as Promise<CarUploadUrlResponse>;
}

export async function createCarListing(token: string, payload: CarListingPayload): Promise<OwnerCar> {
  const response = await fetch(`${API_BASE_URL}/cars`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  await ensureOk(response, 'Failed to create listing.');
  return (await response.json()) as OwnerCar;
}

export async function updateCarListing(
  token: string,
  listingId: string,
  payload: Partial<CarListingPayload>,
): Promise<OwnerCar> {
  const response = await fetch(`${API_BASE_URL}/cars/${listingId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  await ensureOk(response, 'Failed to update listing.');
  return (await response.json()) as OwnerCar;
}

export async function getSubscriptionOverview(token: string): Promise<SubscriptionOverview> {
  const response = await fetch(`${API_BASE_URL}/subscriptions/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  await ensureOk(response, 'Failed to load subscription.');
  return (await response.json()) as SubscriptionOverview;
}

export type SubscriptionInitiateResponse = {
  subscriptionId: string;
  reference: string;
  status: string;
  tier: string;
  amountRwf: number;
  paymentMethod: string;
  redirectUrl?: string;
};

export async function initiateSubscription(
  token: string,
  payload: {
    tier: 'basic' | 'premium' | 'enterprise';
    paymentMethod: 'mtn_momo' | 'airtel_money';
    mobileNumber: string;
  },
): Promise<SubscriptionInitiateResponse> {
  const response = await fetch(`${API_BASE_URL}/subscriptions/initiate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  await ensureOk(response, 'Failed to start subscription payment.');
  return response.json();
}

export async function upgradeSubscription(
  token: string,
  payload: {
    tier: 'basic' | 'premium' | 'enterprise';
    paymentMethod: 'mtn_momo' | 'airtel_money';
    mobileNumber: string;
  },
): Promise<SubscriptionInitiateResponse> {
  const response = await fetch(`${API_BASE_URL}/subscriptions/upgrade`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  await ensureOk(response, 'Failed to upgrade subscription.');
  return response.json();
}

export type SubscriptionPayment = {
  id: string;
  tier?: string;
  status: string;
  amountRwf: number;
  paymentMethod: string | null;
  startsAt: string;
  renewsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export async function getSubscriptionPaymentHistory(token: string): Promise<SubscriptionPayment[]> {
  const response = await fetch(`${API_BASE_URL}/subscriptions/history`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return [];
  return (await response.json()) as SubscriptionPayment[];
}

export async function getDriverSubscriptionOverview(token: string): Promise<{
  subscription: null | { id: string; status: string; renewsAt: string | null; amountRwf: number; paymentMethod: string | null };
  isActive: boolean;
  planPriceRwf: number;
}> {
  const response = await fetch(`${API_BASE_URL}/subscriptions/driver/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return { subscription: null, isActive: false, planPriceRwf: 5000 };
  return response.json();
}

export async function initiateDriverSubscription(
  token: string,
  payload: { paymentMethod: 'mtn_momo' | 'airtel_money'; mobileNumber: string },
): Promise<SubscriptionInitiateResponse> {
  const response = await fetch(`${API_BASE_URL}/subscriptions/driver/initiate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await ensureOk(response, 'Failed to start driver subscription payment.');
  return response.json();
}

export async function cancelDriverSubscription(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/subscriptions/driver/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureOk(response, 'Failed to cancel driver subscription.');
}

export async function cancelSubscription(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/subscriptions/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureOk(response, 'Failed to cancel subscription.');
}

export type KycStatus = {
  isVerified: boolean;
  hasSubmittedKyc: boolean;
  verifiedAt: string | null;
  companyName: string | null;
  nationalIdSubmitted: boolean;
  tinSubmitted: boolean;
};

export async function getKycStatus(token: string): Promise<KycStatus> {
  const response = await fetch(`${API_BASE_URL}/users/me/kyc`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  await ensureOk(response, 'Failed to load KYC status.');
  return (await response.json()) as KycStatus;
}

export async function submitKyc(
  token: string,
  payload: { nationalIdNumber?: string; tinNumber?: string; companyName?: string },
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/me/kyc`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await ensureOk(response, 'Failed to submit KYC information.');
}

export async function getDriverProfileMe(token: string): Promise<DriverProfileMe | null> {
  const response = await fetch(`${API_BASE_URL}/drivers/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (response.status === 404 || response.status === 403) {
    return null;
  }
  await ensureOk(response, 'Failed to load driver profile.');
  return (await response.json()) as DriverProfileMe;
}
