'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type AdminOverview = {
  metrics: {
    totalUsers: number;
    usersByRole: Array<{ role: string; count: number }>;
    activeBookingsToday: number;
    openDisputes: number;
    monthlySubscriptionRevenueRwf: number;
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
  ownerOrDriver: { id: string; fullName: string };
  renter: { id: string; fullName: string };
  summary: string;
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

export type AdminListingItem = {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  vehicleType: string;
  serviceType: string;
  status: string;
  locationText: string;
  dailyRateKigaliRwf: number;
  dailyRateCountrysideRwf: number;
  photos: string[];
  createdAt: string;
  owner: { id: string; fullName: string; email: string };
};

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
  return authRequest<Paginated<AdminListingItem>>(
    token,
    `/admin/listings${suffix}`,
    undefined,
    'Failed to load listings.',
  );
}

export async function approveListing(token: string, listingId: string) {
  await authRequest<void>(
    token,
    `/admin/listings/${listingId}/approve`,
    { method: 'PATCH' },
    'Failed to approve listing.',
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
  dailyRateKigaliRwf: number;
  dailyRateCountrysideRwf: number;
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
  primaryCity: string;
  createdAt: string;
  user: { id: string; fullName: string; email: string; phone: string | null; status: string };
};

export type ListDriversFilters = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminDrivers(token: string, filters: ListDriversFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
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

export async function deleteDriver(token: string, driverProfileId: string) {
  await authRequest<void>(
    token,
    `/admin/drivers/${driverProfileId}`,
    { method: 'DELETE' },
    'Failed to delete driver.',
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
