'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type AdminOverview = {
  metrics: {
    totalUsers: number;
    usersByRole: Array<{ role: string; count: number }>;
    activeBookingsToday: number;
    openDisputes: number;
    monthlySubscriptionRevenueRwf: number;
    pendingDeskCarBookings: number;
    pendingDeskDriverBookings: number;
    pendingDeskBookings: number;
  };
  trustScoreDistribution: Record<string, number>;
  openDisputes: Array<{
    id: string;
    status: string;
    priority: 'low' | 'medium' | 'high';
    reason: string;
    bookingType: 'car' | 'driver';
    bookingId: string | null;
    createdAt: string;
    openedBy: { id: string; fullName: string };
    againstUser: { id: string; fullName: string };
  }>;
};

export type ResolveDisputePayload = {
  bookingOutcome: 'auto_completed' | 'cancelled_admin';
  resolutionNote: string;
  adminNotes?: string;
  trustAdjustments?: Array<{
    userId: string;
    delta: number;
    reason: string;
  }>;
};

export type Paginated<T> = {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
};

export type AdminUserListItem = {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  status: string;
  isVerified: boolean;
  primaryRole: string;
  roles: string[];
  trustScore: number;
  trustTier: string;
  createdAt: string;
  bookingCount: number;
  listingCount: number;
};

export type AdminSubscriptionItem = {
  id: string;
  userId: string;
  tier: string;
  status: string;
  amountRwf: number;
  paymentMethod: string | null;
  renewsAt: string | null;
  startsAt: string;
  endsAt: string | null;
  owner: {
    id: string;
    fullName: string;
    email: string;
  };
};

export type AdminBookingItem = {
  bookingType: 'car' | 'driver';
  id: string;
  status: string;
  amountRwf: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  pickupAddress?: string | null;
  notes?: string | null;
  renterPhone?: string | null;
  isInstant?: boolean;
  fulfillment?: 'instant' | 'standard';
  ownerOrDriver: { id: string; fullName: string; phone?: string | null; whatsapp?: string | null };
  renter: { id: string; fullName: string; phone?: string | null };
  summary: string;
  service?: string;
};

export type DeskCarAlternative = {
  id: string;
  title: string;
  locationText: string;
  vehicleType: string;
  owner: { id: string; fullName: string; phone: string | null };
};

export type DeskDriverAlternative = {
  id: string;
  userId: string;
  primaryCity: string;
  user: { id: string; fullName: string; phone: string | null };
};

export type AdminDisputeItem = {
  id: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  reason: string;
  description: string | null;
  openedById: string;
  againstUserId: string;
  carBookingId: string | null;
  driverBookingId: string | null;
  createdAt: string;
  openedBy: { id: string; fullName: string };
  againstUser: { id: string; fullName: string };
  resolvedBy: { id: string; fullName: string } | null;
};

export type AdminDisputeDetail = {
  id: string;
  status: string;
  reason: string;
  description: string | null;
  resolutionNote: string | null;
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  openedBy: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    trustScore: number;
  };
  againstUser: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    trustScore: number;
  };
  carBooking: Record<string, unknown> | null;
  driverBooking: Record<string, unknown> | null;
  chatLog: Array<{
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
    sender: { id: string; fullName: string };
    receiver: { id: string; fullName: string };
  }>;
};

export type AdminAnalytics = {
  userGrowth: Array<Record<string, number | string>>;
  bookingVolume: Array<{ month: string; car: number; driver: number }>;
  subscriptionRevenueByTier: Array<Record<string, number | string>>;
  cancellationNoShowRates: {
    cancellationRate: number;
    noShowRate: number;
    totalBookings: number;
  };
  trustScoreDistribution: Record<string, number>;
};

async function readError(response: Response, fallbackMessage: string): Promise<never> {
  let detail = fallbackMessage;
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (typeof payload.message === 'string') {
      detail = payload.message;
    } else if (Array.isArray(payload.message) && payload.message[0]) {
      detail = payload.message[0];
    }
  } catch {
    // Ignore parse error and use fallback
  }
  throw new Error(detail);
}

async function authRequest<T>(token: string, path: string, init?: RequestInit, fallbackMessage?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    await readError(response, fallbackMessage ?? 'Request failed.');
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function getAdminOverview(token: string): Promise<AdminOverview> {
  return authRequest<AdminOverview>(token, '/admin/overview', undefined, 'Failed to load admin overview.');
}

export async function getAdminAnalytics(token: string): Promise<AdminAnalytics> {
  return authRequest<AdminAnalytics>(token, '/admin/analytics', undefined, 'Failed to load analytics.');
}

export type ListUsersFilters = {
  search?: string;
  role?: string;
  status?: string;
  trustTier?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminUsers(token: string, filters: ListUsersFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.role) params.set('role', filters.role);
  if (filters.status) params.set('status', filters.status);
  if (filters.trustTier) params.set('trustTier', filters.trustTier);
  if (filters.page != null) params.set('page', String(filters.page));
  if (filters.pageSize != null) params.set('pageSize', String(filters.pageSize));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return authRequest<Paginated<AdminUserListItem>>(token, `/admin/users${suffix}`, undefined, 'Failed to load users.');
}

export async function suspendUser(token: string, userId: string, reason?: string) {
  await authRequest<void>(
    token,
    `/admin/users/${userId}/suspend`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
    'Failed to suspend user.',
  );
}

export async function reinstateUser(token: string, userId: string, reason?: string) {
  await authRequest<void>(
    token,
    `/admin/users/${userId}/reinstate`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
    'Failed to reinstate user.',
  );
}

export async function verifyUserPhone(token: string, userId: string) {
  await authRequest<void>(token, `/admin/users/${userId}/verify-phone`, { method: 'PATCH' }, 'Failed to verify phone.');
}

export async function verifyUserKyc(token: string, userId: string) {
  await authRequest<void>(token, `/admin/users/${userId}/verify-kyc`, { method: 'POST' }, 'Failed to verify KYC.');
}

export async function adjustUserTrust(token: string, userId: string, delta: number, reason: string) {
  await authRequest<void>(
    token,
    `/admin/users/${userId}/trust-score-adjustments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, reason }),
    },
    'Failed to adjust trust score.',
  );
}

export type ListSubscriptionsFilters = {
  status?: string;
  tier?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminSubscriptions(token: string, filters: ListSubscriptionsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.tier) params.set('tier', filters.tier);
  if (filters.page != null) params.set('page', String(filters.page));
  if (filters.pageSize != null) params.set('pageSize', String(filters.pageSize));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return authRequest<Paginated<AdminSubscriptionItem>>(
    token,
    `/admin/subscriptions${suffix}`,
    undefined,
    'Failed to load subscriptions.',
  );
}

export async function activateSubscription(token: string, subscriptionId: string, reason?: string) {
  await authRequest<void>(
    token,
    `/admin/subscriptions/${subscriptionId}/activate`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
    'Failed to activate subscription.',
  );
}

export async function deactivateSubscription(token: string, subscriptionId: string, reason?: string) {
  await authRequest<void>(
    token,
    `/admin/subscriptions/${subscriptionId}/deactivate`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
    'Failed to deactivate subscription.',
  );
}

export type AdminPromoCode = {
  id: string;
  code: string;
  kind: 'hoster' | 'driver' | 'taxi' | null;
  discountPercent: number | null;
  discountRwf: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export async function listAdminPromoCodes(token: string) {
  return authRequest<AdminPromoCode[]>(token, '/admin/promo-codes', undefined, 'Failed to load promo codes.');
}

export async function createAdminPromoCode(
  token: string,
  payload: {
    code: string;
    kind?: 'hoster' | 'driver' | 'taxi';
    discountPercent?: number;
    discountRwf?: number;
    maxRedemptions?: number;
    isActive?: boolean;
  },
) {
  return authRequest<AdminPromoCode>(
    token,
    '/admin/promo-codes',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create promo code.',
  );
}

export async function updateAdminPromoCode(
  token: string,
  id: string,
  payload: { isActive?: boolean },
) {
  return authRequest<AdminPromoCode>(
    token,
    `/admin/promo-codes/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update promo code.',
  );
}

export async function deleteAdminPromoCode(token: string, id: string) {
  await authRequest<void>(token, `/admin/promo-codes/${id}`, { method: 'DELETE' }, 'Failed to delete promo code.');
}

export type ListBookingsFilters = {
  type?: 'car' | 'driver' | 'all';
  status?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminBookings(token: string, filters: ListBookingsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page != null) params.set('page', String(filters.page));
  if (filters.pageSize != null) params.set('pageSize', String(filters.pageSize));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return authRequest<Paginated<AdminBookingItem>>(token, `/admin/bookings${suffix}`, undefined, 'Failed to load bookings.');
}

export type ListDisputesFilters = {
  openOnly?: boolean;
  status?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminDisputes(token: string, filters: ListDisputesFilters = {}) {
  const params = new URLSearchParams();
  if (filters.openOnly != null) params.set('openOnly', String(filters.openOnly));
  if (filters.status) params.set('status', filters.status);
  if (filters.page != null) params.set('page', String(filters.page));
  if (filters.pageSize != null) params.set('pageSize', String(filters.pageSize));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return authRequest<Paginated<AdminDisputeItem>>(
    token,
    `/admin/disputes${suffix}`,
    undefined,
    'Failed to load disputes.',
  );
}

export async function getAdminDispute(token: string, disputeId: string) {
  return authRequest<AdminDisputeDetail>(token, `/admin/disputes/${disputeId}`, undefined, 'Failed to load dispute.');
}

export async function cancelAdminBooking(token: string, type: 'car' | 'driver', id: string, reason?: string) {
  await authRequest<void>(
    token,
    `/admin/bookings/${type}/${id}/cancel`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
    'Failed to cancel booking.',
  );
}

export async function confirmAdminDeskBooking(token: string, type: 'car' | 'driver', id: string) {
  await authRequest<void>(
    token,
    `/admin/bookings/${type}/${id}/confirm`,
    { method: 'POST' },
    'Failed to confirm booking.',
  );
}

export async function rejectAdminDeskBooking(token: string, type: 'car' | 'driver', id: string) {
  await authRequest<void>(
    token,
    `/admin/bookings/${type}/${id}/reject`,
    { method: 'POST' },
    'Failed to reject booking.',
  );
}

export async function listAdminDeskAlternatives(token: string, type: 'car' | 'driver', id: string) {
  return authRequest<DeskCarAlternative[] | DeskDriverAlternative[]>(
    token,
    `/admin/bookings/${type}/${id}/alternatives`,
    undefined,
    'Failed to load alternatives.',
  );
}

export async function tryNextAdminDeskBooking(
  token: string,
  type: 'car' | 'driver',
  id: string,
  payload: { listingId?: string; driverId?: string },
) {
  await authRequest<void>(
    token,
    `/admin/bookings/${type}/${id}/try-next`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to move booking to the next provider.',
  );
}

export async function resolveDispute(token: string, disputeId: string, payload: ResolveDisputePayload) {
  await authRequest<void>(
    token,
    `/admin/disputes/${disputeId}/resolve`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    'Failed to resolve dispute.',
  );
}

export async function dismissDispute(token: string, disputeId: string, adminNotes?: string) {
  await authRequest<void>(
    token,
    `/admin/disputes/${disputeId}/dismiss`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminNotes }),
    },
    'Failed to dismiss dispute.',
  );
}

export async function escalateDispute(token: string, disputeId: string) {
  await authRequest<void>(
    token,
    `/admin/disputes/${disputeId}/escalate`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    'Failed to escalate dispute.',
  );
}

export type AdminListingOwner = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  hostType: 'individual' | 'company' | null;
  companyName: string | null;
  workAddress: string | null;
  contactPhone: string | null;
};

export type AdminListingItem = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  vehicleType: string;
  serviceType: string;
  brand: string;
  model: string;
  year: number;
  seats: number;
  transmission: string | null;
  fuelType: string | null;
  plateNumber: string | null;
  color: string | null;
  listingCity: string;
  locationText: string;
  dailyRateInCityRwf: number;
  dailyRateOutsideCityRwf: number;
  weeklyRateInCityRwf: number;
  weeklyRateOutsideCityRwf: number;
  monthlyRateInCityRwf: number;
  monthlyRateOutsideCityRwf: number;
  priceNegotiable: boolean;
  photos: string[];
  features: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  owner: AdminListingOwner;
};

type LegacyAdminListingFields = {
  dailyRateKigaliRwf?: number;
  dailyRateCountrysideRwf?: number;
  weeklyRateKigaliRwf?: number;
  weeklyRateCountrysideRwf?: number;
  monthlyRateKigaliRwf?: number;
  monthlyRateCountrysideRwf?: number;
};

function normalizeAdminListing(raw: AdminListingItem & LegacyAdminListingFields): AdminListingItem {
  const dailyIn = raw.dailyRateInCityRwf ?? raw.dailyRateKigaliRwf;
  const dailyOut = raw.dailyRateOutsideCityRwf ?? raw.dailyRateCountrysideRwf;
  return {
    ...raw,
    listingCity: raw.listingCity?.trim() || '—',
    dailyRateInCityRwf: dailyIn ?? 0,
    dailyRateOutsideCityRwf: dailyOut ?? 0,
    weeklyRateInCityRwf: raw.weeklyRateInCityRwf ?? raw.weeklyRateKigaliRwf ?? dailyIn ?? 0,
    weeklyRateOutsideCityRwf: raw.weeklyRateOutsideCityRwf ?? raw.weeklyRateCountrysideRwf ?? dailyOut ?? 0,
    monthlyRateInCityRwf: raw.monthlyRateInCityRwf ?? raw.monthlyRateKigaliRwf ?? dailyIn ?? 0,
    monthlyRateOutsideCityRwf: raw.monthlyRateOutsideCityRwf ?? raw.monthlyRateCountrysideRwf ?? dailyOut ?? 0,
  };
}

export type ListListingsFilters = {
  status?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminListings(token: string, filters: ListListingsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.page != null) params.set('page', String(filters.page));
  if (filters.pageSize != null) params.set('pageSize', String(filters.pageSize));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await authRequest<Paginated<AdminListingItem & LegacyAdminListingFields>>(
    token,
    `/admin/listings${suffix}`,
    undefined,
    'Failed to load listings.',
  );
  return { ...res, items: res.items.map(normalizeAdminListing) };
}

export async function getAdminListingDetail(token: string, listingId: string) {
  const raw = await authRequest<AdminListingItem & LegacyAdminListingFields>(
    token,
    `/admin/listings/${listingId}`,
    undefined,
    'Failed to load listing detail.',
  );
  return normalizeAdminListing(raw);
}

export async function approveListing(token: string, listingId: string) {
  await authRequest<void>(
    token,
    `/admin/listings/${listingId}/approve`,
    { method: 'PATCH' },
    'Failed to approve listing.',
  );
}

export type AdminListingMarketplaceStatus = 'active' | 'inactive' | 'booked';

export async function setAdminListingStatus(
  token: string,
  listingId: string,
  status: AdminListingMarketplaceStatus,
) {
  return authRequest<AdminListingItem>(
    token,
    `/admin/listings/${listingId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
    'Failed to update listing status.',
  );
}

export async function rejectListing(token: string, listingId: string, reason: string) {
  await authRequest<void>(
    token,
    `/admin/listings/${listingId}/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
    'Failed to reject listing.',
  );
}

export async function grantAdminRole(token: string, userId: string) {
  await authRequest<void>(
    token,
    `/admin/users/${userId}/grant-admin`,
    { method: 'POST' },
    'Failed to grant admin role.',
  );
}

export async function revokeAdminRole(token: string, userId: string) {
  await authRequest<void>(
    token,
    `/admin/users/${userId}/grant-admin`,
    { method: 'DELETE' },
    'Failed to revoke admin role.',
  );
}

export async function deleteListing(token: string, listingId: string) {
  await authRequest<void>(
    token,
    `/admin/listings/${listingId}`,
    { method: 'DELETE' },
    'Failed to delete listing.',
  );
}

export type AdminCreateCarPayload = {
  userId: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  vehicleType: string;
  serviceType: string;
  seats: number;
  dailyRateInCityRwf: number;
  dailyRateOutsideCityRwf: number;
  weeklyRateInCityRwf: number;
  weeklyRateOutsideCityRwf: number;
  monthlyRateInCityRwf: number;
  monthlyRateOutsideCityRwf: number;
  listingCity?: string;
  locationText: string;
  transmission?: string;
  fuelType?: string;
  description?: string;
};

export async function adminCreateCar(token: string, payload: AdminCreateCarPayload) {
  return authRequest<AdminListingItem>(
    token,
    '/admin/cars',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, photos: [], features: [] }),
    },
    'Failed to create listing.',
  );
}

export type AdminDriverItem = {
  id: string;
  driverCategory: string;
  yearsExperience: number;
  dailyRateRwf: number;
  monthlyRateRwf?: number | null;
  primaryCity: string;
  createdAt: string;
  status?: string;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  licenseCategories?: string[];
  transmission?: string | null;
  addressText?: string | null;
  idDocumentUrl?: string | null;
  licenseDocumentUrl?: string | null;
  languages?: string[];
  certifications?: string[];
  user: { id: string; fullName: string; email: string; phone: string | null; status: string; avatarUrl?: string | null };
};

export type AdminDriverDetail = AdminDriverItem & {
  hourlyRateRwf: number | null;
  weeklyRateRwf: number | null;
  biography: string | null;
  categories: string[];
  vehicleTypes: string[];
  serviceAreas: string[];
  certifications: string[];
  availabilityCalendar: unknown;
  user: AdminDriverItem['user'] & { whatsapp: string | null; trustScore: number };
};

export type ListDriversFilters = {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminDrivers(token: string, filters: ListDriversFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page != null) params.set('page', String(filters.page));
  if (filters.pageSize != null) params.set('pageSize', String(filters.pageSize));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return authRequest<Paginated<AdminDriverItem>>(
    token,
    `/admin/drivers${suffix}`,
    undefined,
    'Failed to load drivers.',
  );
}

export type AdminTaxiItem = {
  id: string;
  fullName: string;
  phone: string;
  whatsapp: string | null;
  city: string;
  workLocationText: string | null;
  carModel: string | null;
  plate: string | null;
  vehicleType: string | null;
  status: string;
  createdAt: string;
  user: { id: string; email: string; fullName: string; phone: string | null } | null;
};

export type ListTaxisFilters = {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminTaxis(token: string, filters: ListTaxisFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page != null) params.set('page', String(filters.page));
  if (filters.pageSize != null) params.set('pageSize', String(filters.pageSize));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return authRequest<Paginated<AdminTaxiItem>>(
    token,
    `/admin/taxis${suffix}`,
    undefined,
    'Failed to load taxis.',
  );
}

export async function setAdminTaxiStatus(token: string, taxiId: string, status: string) {
  return authRequest<AdminTaxiItem>(
    token,
    `/admin/taxis/${taxiId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
    'Failed to update taxi status.',
  );
}

export async function deleteDriver(token: string, driverProfileId: string) {
  await authRequest<void>(
    token,
    `/admin/drivers/${driverProfileId}`,
    { method: 'DELETE' },
    'Failed to delete driver.',
  );
}

export async function getAdminDriverDetail(token: string, driverProfileId: string) {
  return authRequest<AdminDriverDetail>(
    token,
    `/admin/drivers/${driverProfileId}`,
    undefined,
    'Failed to load driver application.',
  );
}

export async function approveDriverApplication(token: string, driverProfileId: string) {
  return authRequest<{ id: string; status: string }>(
    token,
    `/admin/drivers/${driverProfileId}/approve`,
    { method: 'POST' },
    'Failed to approve driver.',
  );
}

export async function rejectDriverApplication(token: string, driverProfileId: string, reason: string) {
  return authRequest<{ id: string; status: string; rejectionReason: string }>(
    token,
    `/admin/drivers/${driverProfileId}/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
    'Failed to reject driver.',
  );
}

export type AdminCreateDriverPayload = {
  userId: string;
  driverCategory: string;
  yearsExperience: number;
  dailyRateRwf: number;
  hourlyRateRwf?: number;
  primaryCity: string;
  languages: string[];
  categories: string[];
  vehicleTypes: string[];
  serviceAreas: string[];
  biography?: string;
};

export async function adminCreateDriver(token: string, payload: AdminCreateDriverPayload) {
  return authRequest<AdminDriverItem>(
    token,
    '/admin/driver-profiles',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, certifications: [] }),
    },
    'Failed to create driver profile.',
  );
}

export type AdminUploadUrlResult = {
  uploadUrl: string;
  fields: Record<string, string | number>;
};

export async function adminGetUploadUrl(token: string, folder = 'rentingi/cars'): Promise<AdminUploadUrlResult> {
  return authRequest<AdminUploadUrlResult>(
    token,
    `/admin/upload-url?folder=${encodeURIComponent(folder)}`,
    undefined,
    'Failed to get upload URL.',
  );
}

// ── Driver Overview ───────────────────────────────────────────────────────────

export type DriverOverviewItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  hasProfile: boolean;
  profileId: string | null;
  primaryCity: string | null;
  driverCategory: string | null;
  subscriptionStatus: string | null;
  subscriptionRenewsAt: string | null;
  isVisibleInSearch: boolean;
};

export async function listDriverOverview(token: string, page = 1, pageSize = 30, search?: string) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search?.trim()) params.set('search', search.trim());
  return authRequest<Paginated<DriverOverviewItem>>(
    token,
    `/admin/drivers/overview?${params.toString()}`,
    undefined,
    'Failed to load driver overview.',
  );
}

export async function activateDriverSubscription(token: string, userId: string) {
  return authRequest<{ subscriptionId: string; renewsAt: string; userId: string }>(
    token,
    `/admin/drivers/${userId}/activate-subscription`,
    { method: 'POST' },
    'Failed to activate driver subscription.',
  );
}

// ── Site Banners ─────────────────────────────────────────────────────────────

export type SiteBannerItem = {
  id: string;
  message: string;
  ctaText: string | null;
  ctaUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listAdminBanners(token: string): Promise<SiteBannerItem[]> {
  return authRequest<SiteBannerItem[]>(token, '/admin/banners', undefined, 'Failed to load banners.');
}

export async function createAdminBanner(
  token: string,
  payload: { message: string; ctaText?: string; ctaUrl?: string; isActive?: boolean },
): Promise<SiteBannerItem> {
  return authRequest<SiteBannerItem>(
    token,
    '/admin/banners',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create banner.',
  );
}

export async function updateAdminBanner(
  token: string,
  id: string,
  payload: { message?: string; ctaText?: string | null; ctaUrl?: string | null; isActive?: boolean },
): Promise<SiteBannerItem> {
  return authRequest<SiteBannerItem>(
    token,
    `/admin/banners/${id}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update banner.',
  );
}

export async function deleteAdminBanner(token: string, id: string): Promise<void> {
  await authRequest<void>(token, `/admin/banners/${id}`, { method: 'DELETE' }, 'Failed to delete banner.');
}

export type JobOpeningItem = {
  id: string;
  title: string;
  employmentType: string;
  location: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type JobOpeningPayload = {
  title: string;
  employmentType: string;
  location: string;
  description: string;
  isActive?: boolean;
};

export async function listAdminJobs(token: string): Promise<JobOpeningItem[]> {
  return authRequest<JobOpeningItem[]>(token, '/admin/jobs', undefined, 'Failed to load jobs.');
}

export async function createAdminJob(token: string, payload: JobOpeningPayload): Promise<JobOpeningItem> {
  return authRequest<JobOpeningItem>(
    token,
    '/admin/jobs',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to create job.',
  );
}

export async function updateAdminJob(
  token: string,
  id: string,
  payload: Partial<JobOpeningPayload>,
): Promise<JobOpeningItem> {
  return authRequest<JobOpeningItem>(
    token,
    `/admin/jobs/${id}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    'Failed to update job.',
  );
}

export async function deleteAdminJob(token: string, id: string): Promise<void> {
  await authRequest<void>(token, `/admin/jobs/${id}`, { method: 'DELETE' }, 'Failed to delete job.');
}
