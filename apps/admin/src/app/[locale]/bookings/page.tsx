'use client';

import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  cancelAdminBooking,
  confirmAdminDeskBooking,
  listAdminBookings,
  listAdminDeskAlternatives,
  rejectAdminDeskBooking,
  tryNextAdminDeskBooking,
  type AdminBookingItem,
  type DeskCarAlternative,
  type DeskDriverAlternative,
  type ListBookingsFilters,
} from '@/lib/api';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import {
  adminBtnDanger,
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminPage,
  adminSelect,
} from '@/components/admin/admin-ui';
import { useAuthToken } from '@/lib/use-auth-token';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';
const AUTO_REFRESH_MS = 45_000;

const STATUSES = [
  'pending', 'confirmed', 'active', 'disputed', 'completed', 'auto_completed',
  'cancelled_admin', 'cancelled_by_renter', 'cancelled_by_owner', 'declined', 'auto_cancelled',
] as const;

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-900 border-emerald-400',
  confirmed: 'bg-blue-100 text-blue-900 border-blue-400',
  pending: 'bg-amber-100 text-amber-900 border-amber-400',
  disputed: 'bg-red-100 text-red-800 border-red-400',
  completed: 'bg-muted text-ink/80 border-border',
  auto_completed: 'bg-muted text-ink/80 border-border',
  declined: 'bg-muted text-ink/80 border-border',
};

const PAGE_SIZE = 20;

function telHref(phone?: string | null) {
  if (!phone) return null;
  return `tel:${phone.replace(/\s/g, '')}`;
}

function waHref(phone?: string | null, text?: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!text?.trim()) return base;
  return `${base}?text=${encodeURIComponent(text.trim().slice(0, 1500))}`;
}

function providerDeskWhatsAppText(booking: AdminBookingItem): string {
  return [
    `Hello ${booking.ownerOrDriver.fullName},`,
    '',
    `renting.rw has a ${booking.bookingType} booking request:`,
    booking.summary,
    `Client: ${booking.renter.fullName} (${booking.renterPhone ?? booking.renter.phone ?? 'no phone'})`,
    `When: ${formatWhen(booking.startsAt)} → ${formatWhen(booking.endsAt)}`,
    booking.pickupAddress ? `Pickup: ${booking.pickupAddress}` : '',
    booking.notes ? `Note: ${booking.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatUpdatedAt(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const PUBLIC_APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://renting.rw').replace(/\/$/, '');

function publicAssetHref(booking: AdminBookingItem): string | null {
  if (booking.bookingType === 'car' && booking.listingId) {
    return `${PUBLIC_APP_URL}/en/cars/${booking.listingId}`;
  }
  if (booking.bookingType === 'driver') {
    return `${PUBLIC_APP_URL}/en/drivers/${booking.ownerOrDriver.id}`;
  }
  return null;
}

const compactBtnPrimary =
  'inline-flex items-center justify-center rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40';
const compactBtnDanger =
  'inline-flex items-center justify-center rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-40';
const compactBtnGhost =
  'inline-flex items-center justify-center rounded-full border border-border bg-card px-2.5 py-1 text-xs font-bold text-ink hover:bg-brand-soft disabled:opacity-40';

function BookingCardSkeleton() {
  return (
    <li className="animate-pulse rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="h-3.5 w-48 rounded bg-muted" />
      <div className="mt-1.5 h-3 w-full max-w-2xl rounded bg-muted/80" />
    </li>
  );
}

type BookingDeskCardProps = {
  booking: AdminBookingItem;
  actingId: string | null;
  onConfirm: (b: AdminBookingItem) => void;
  onReject: (b: AdminBookingItem) => void;
  onTryNext: (b: AdminBookingItem) => void;
  onCancel: (b: AdminBookingItem) => void;
};

function BookingDeskCard({ booking, actingId, onConfirm, onReject, onTryNext, onCancel }: BookingDeskCardProps) {
  const clientPhone = booking.renterPhone || booking.renter.phone;
  const providerPhone = booking.ownerOrDriver.whatsapp ?? booking.ownerOrDriver.phone;
  const providerWaUrl = waHref(providerPhone, providerDeskWhatsAppText(booking));
  const pendingDesk = booking.status === 'pending' && !booking.isInstant;
  const isInstant = booking.isInstant || booking.fulfillment === 'instant';
  const siteHref = publicAssetHref(booking);
  const busy = actingId === booking.id;
  const showActions =
    pendingDesk || !['completed', 'auto_completed', 'cancelled_admin', 'declined'].includes(booking.status);
  const tripLine = [
    `${formatWhen(booking.startsAt)} → ${formatWhen(booking.endsAt)}`,
    booking.pickupAddress ? `Pickup: ${booking.pickupAddress}` : null,
    booking.notes ? `Note: ${booking.notes}` : null,
    `${booking.amountRwf.toLocaleString('en-RW')} RWF`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded border px-1.5 py-0 text-[10px] font-black capitalize leading-5 ${STATUS_STYLE[booking.status] ?? 'border-border bg-muted text-ink/80'}`}
            >
              {booking.status.replace(/_/g, ' ')}
            </span>
            <span className="rounded border border-border px-1.5 py-0 text-[10px] font-black uppercase leading-5 text-ink/70">
              {booking.bookingType}
            </span>
            {isInstant ? (
              <span className="rounded border border-sky-400 bg-sky-50 px-1.5 py-0 text-[10px] font-black uppercase leading-5 text-sky-900">
                Instant
              </span>
            ) : null}
            <span className="truncate font-black text-ink">{booking.summary}</span>
            {siteHref ? (
              <a
                href={siteHref}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[10px] font-bold text-brand hover:underline"
              >
                View
              </a>
            ) : null}
            <span className="ml-auto shrink-0 text-[10px] font-medium text-muted-foreground md:ml-0">
              {formatWhen(booking.createdAt)}
            </span>
          </div>
          <p className="text-xs font-medium leading-snug text-ink/90">
            <span className="font-bold">Client</span> {booking.renter.fullName}
            {clientPhone ? (
              <>
                {' '}
                <a className="text-sky-800 hover:underline" href={telHref(clientPhone) ?? undefined}>
                  {clientPhone}
                </a>
              </>
            ) : null}
            <span className="text-muted-foreground"> · </span>
            <span className="font-bold">Provider</span> {booking.ownerOrDriver.fullName}
            {providerPhone ? (
              <>
                {' '}
                <a className="text-sky-800 hover:underline" href={telHref(providerPhone) ?? undefined}>
                  {providerPhone}
                </a>
              </>
            ) : null}
            {providerWaUrl ? (
              <>
                {' '}
                <a
                  className="font-bold text-emerald-800 hover:underline"
                  href={providerWaUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  WA
                </a>
              </>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={tripLine}>
            {tripLine}
          </p>
        </div>

        {showActions ? (
          <div className="flex shrink-0 flex-wrap gap-1 md:max-w-[220px] md:justify-end">
            {pendingDesk ? (
              <>
                <button type="button" className={compactBtnPrimary} disabled={busy} onClick={() => void onConfirm(booking)}>
                  Confirm
                </button>
                <button type="button" className={compactBtnDanger} disabled={busy} onClick={() => void onReject(booking)}>
                  Reject
                </button>
                <button type="button" className={compactBtnGhost} disabled={busy} onClick={() => void onTryNext(booking)}>
                  Try next
                </button>
              </>
            ) : (
              <button
                type="button"
                className={compactBtnDanger}
                disabled={
                  busy || ['completed', 'auto_completed', 'cancelled_admin', 'declined'].includes(booking.status)
                }
                onClick={() => void onCancel(booking)}
              >
                Cancel
              </button>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default function AdminBookingsPage() {
  const searchParams = useSearchParams();
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [data, setData] = useState<{ items: AdminBookingItem[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [filters, setFilters] = useState<ListBookingsFilters>(() => {
    const userId = searchParams.get('userId')?.trim();
    const statusParam = searchParams.get('status')?.trim();
    const typeParam = searchParams.get('type')?.trim();
    const dateFrom = searchParams.get('dateFrom')?.trim();
    const dateTo = searchParams.get('dateTo')?.trim();
    const deskType =
      typeParam === 'car' || typeParam === 'driver' || typeParam === 'all' ? typeParam : 'all';
    if (userId) {
      return {
        type: deskType,
        status: statusParam || undefined,
        userId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page: 1,
        pageSize: PAGE_SIZE,
      };
    }
    return {
      type: deskType,
      status: statusParam || 'pending',
      userId: undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: 1,
      pageSize: PAGE_SIZE,
    };
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [tryNextFor, setTryNextFor] = useState<AdminBookingItem | null>(null);
  const [alternatives, setAlternatives] = useState<Array<DeskCarAlternative | DeskDriverAlternative>>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);

  useEffect(() => {
    const userId = searchParams.get('userId')?.trim();
    const statusParam = searchParams.get('status')?.trim();
    const typeParam = searchParams.get('type')?.trim();
    const dateFrom = searchParams.get('dateFrom')?.trim();
    const dateTo = searchParams.get('dateTo')?.trim();
    const deskType =
      typeParam === 'car' || typeParam === 'driver' || typeParam === 'all' ? typeParam : undefined;
    setFilters((prev) => ({
      ...prev,
      userId: userId || undefined,
      status: userId ? statusParam || undefined : statusParam || 'pending',
      type: (deskType ?? prev.type ?? 'all') as ListBookingsFilters['type'],
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: 1,
    }));
  }, [searchParams]);

  const loadBookings = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isLoaded || !isSignedIn) {
        return;
      }
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const token = await fetchToken();
        if (!token) throw new Error(AUTH_ERROR_MSG);
        const payload: ListBookingsFilters = { page: filters.page, pageSize: PAGE_SIZE };
        if (filters.type) payload.type = filters.type as 'car' | 'driver' | 'all';
        if (filters.status) payload.status = filters.status;
        if (filters.userId?.trim()) payload.userId = filters.userId.trim();
        if (filters.dateFrom) payload.dateFrom = filters.dateFrom;
        if (filters.dateTo) payload.dateTo = filters.dateTo;
        const response = await listAdminBookings(token, payload);
        setData({ items: response.items, total: response.total, page: response.page });
        setLastRefreshedAt(new Date());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load bookings.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchToken, isLoaded, isSignedIn, filters.page, filters.type, filters.status, filters.userId, filters.dateFrom, filters.dateTo],
  );

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const id = window.setInterval(() => {
      void loadBookings({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [isLoaded, isSignedIn, loadBookings]);

  const withAction = async (booking: AdminBookingItem, handler: (token: string) => Promise<void>) => {
    setActingId(booking.id);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await handler(token);
      await loadBookings({ silent: true });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update booking.');
    } finally {
      setActingId(null);
    }
  };

  const onCancel = (booking: AdminBookingItem) =>
    withAction(booking, async (token) => {
      const reason = window.prompt('Cancellation reason (optional):') ?? undefined;
      await cancelAdminBooking(token, booking.bookingType, booking.id, reason);
    });

  const onConfirm = (booking: AdminBookingItem) =>
    withAction(booking, (token) => confirmAdminDeskBooking(token, booking.bookingType, booking.id));

  const onReject = (booking: AdminBookingItem) =>
    withAction(booking, (token) => rejectAdminDeskBooking(token, booking.bookingType, booking.id));

  const onOpenTryNext = async (booking: AdminBookingItem) => {
    setTryNextFor(booking);
    setLoadingAlts(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const items = await listAdminDeskAlternatives(token, booking.bookingType, booking.id);
      setAlternatives(items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load alternatives.');
      setTryNextFor(null);
    } finally {
      setLoadingAlts(false);
    }
  };

  const onPickAlternative = async (alternative: DeskCarAlternative | DeskDriverAlternative) => {
    if (!tryNextFor) return;
    const booking = tryNextFor;
    await withAction(booking, async (token) => {
      if (booking.bookingType === 'car') {
        await tryNextAdminDeskBooking(token, 'car', booking.id, { listingId: alternative.id });
      } else {
        const driverId = 'userId' in alternative ? alternative.userId : alternative.id;
        await tryNextAdminDeskBooking(token, 'driver', booking.id, { driverId });
      }
    });
    setTryNextFor(null);
    setAlternatives([]);
  };

  const totalPages = Math.ceil(data.total / PAGE_SIZE) || 1;
  const deskPending = data.items.filter((item) => item.status === 'pending' && !item.isInstant).length;

  return (
    <main className={adminPage}>
      <AdminPageHeader
        title="Booking desk"
        description={
          loading && !refreshing
            ? 'Loading requests…'
            : `${deskPending} pending on this page · call the provider, then confirm or reject.`
        }
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={adminSelect}
                value={filters.type ?? 'all'}
                onChange={(e) => {
                  const v = e.target.value as 'car' | 'driver' | 'all';
                  setFilters((f) => ({ ...f, type: v, page: 1 }));
                }}
              >
                <option value="all">All types</option>
                <option value="car">Cars</option>
                <option value="driver">Drivers</option>
              </select>
              <select
                className={adminSelect}
                value={filters.status ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={adminBtnSecondary}
                disabled={loading || refreshing}
                onClick={() => void loadBookings({ silent: Boolean(data.items.length) })}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
                Refresh
              </button>
              <button
                type="button"
                className={adminBtnGhost}
                onClick={() => setShowAdvancedFilters((v) => !v)}
                aria-expanded={showAdvancedFilters}
              >
                {showAdvancedFilters ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
                More filters
              </button>
            </div>
            {lastRefreshedAt ? (
              <p className="text-xs font-medium text-muted-foreground">
                Last updated {formatUpdatedAt(lastRefreshedAt)}
                {refreshing ? ' · refreshing…' : ` · auto-refresh every ${AUTO_REFRESH_MS / 1000}s`}
              </p>
            ) : null}
            {showAdvancedFilters ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
                <input
                  className={`h-9 max-w-xs ${adminInput}`}
                  value={filters.userId ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value, page: 1 }))}
                  placeholder="Filter by user ID"
                  type="text"
                />
                <input
                  className={`h-9 ${adminInput}`}
                  type="date"
                  aria-label="From date"
                  value={filters.dateFrom ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined, page: 1 }))}
                />
                <input
                  className={`h-9 ${adminInput}`}
                  type="date"
                  aria-label="To date"
                  value={filters.dateTo ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined, page: 1 }))}
                />
              </div>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 shadow-brutal-red">
          {error}
        </div>
      ) : null}

      {tryNextFor ? (
        <section className="rounded-2xl border border-border bg-[#fbf4e0] p-4 shadow-brutal">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-ink">Try another provider</h2>
              <p className="text-sm font-medium text-muted-foreground">
                {tryNextFor.summary} · {tryNextFor.renter.fullName} · {formatWhen(tryNextFor.startsAt)}
              </p>
            </div>
            <button
              type="button"
              className={adminBtnGhost}
              onClick={() => {
                setTryNextFor(null);
                setAlternatives([]);
              }}
            >
              Close
            </button>
          </div>
          {loadingAlts ? (
            <p className="mt-3 text-sm font-semibold text-muted-foreground">Loading alternatives…</p>
          ) : alternatives.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-muted-foreground">No free alternatives in this window.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {alternatives.map((item) => {
                const isCar = 'title' in item;
                const title = isCar ? item.title : item.user.fullName;
                const meta = isCar ? `${item.locationText} · ${item.vehicleType}` : item.primaryCity;
                const phone = isCar ? item.owner.phone : item.user.phone;
                const provider = isCar ? item.owner.fullName : item.user.fullName;
                return (
                  <li key={item.id} className="rounded-xl border border-border bg-card p-3">
                    <p className="font-black text-ink">{title}</p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {provider} · {meta}
                    </p>
                    {phone ? <p className="mt-1 text-sm font-semibold">{phone}</p> : null}
                    <button
                      type="button"
                      className={`mt-2 ${adminBtnPrimary}`}
                      disabled={actingId === tryNextFor.id}
                      onClick={() => void onPickAlternative(item)}
                    >
                      Use this provider
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <section className="admin-panel p-3 sm:p-4">
        {loading && data.items.length === 0 ? (
          <ul className="grid gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </ul>
        ) : data.items.length === 0 ? (
          <p className="py-10 text-center text-sm font-semibold text-muted-foreground">
            No bookings match these filters. Try <strong>Refresh</strong> or set status to &quot;All statuses&quot;.
          </p>
        ) : (
          <ul className={`grid gap-1.5 ${refreshing ? 'opacity-70 transition-opacity' : ''}`}>
            {data.items.map((booking) => (
              <BookingDeskCard
                key={`${booking.bookingType}:${booking.id}`}
                booking={booking}
                actingId={actingId}
                onConfirm={onConfirm}
                onReject={onReject}
                onTryNext={onOpenTryNext}
                onCancel={onCancel}
              />
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <p className="text-sm font-semibold text-muted-foreground">
              Page {data.page} of {totalPages} · {data.total} total
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={adminBtnGhost}
                disabled={data.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page ?? 1) - 1 }))}
              >
                Previous
              </button>
              <button
                type="button"
                className={adminBtnGhost}
                disabled={data.page >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page ?? 1) + 1) }))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}