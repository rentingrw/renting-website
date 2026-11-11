'use client';

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
import { useAuthToken } from '@/lib/use-auth-token';
import { TableRowSkeleton } from '@/components/ui/skeleton';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';

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

export default function AdminBookingsPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [data, setData] = useState<{ items: AdminBookingItem[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [filters, setFilters] = useState<ListBookingsFilters>({
    type: 'car',
    status: 'pending',
    userId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [tryNextFor, setTryNextFor] = useState<AdminBookingItem | null>(null);
  const [alternatives, setAlternatives] = useState<Array<DeskCarAlternative | DeskDriverAlternative>>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn, filters.page, filters.type, filters.status, filters.userId, filters.dateFrom, filters.dateTo]);

  useEffect(() => { void loadBookings(); }, [loadBookings]);

  const withAction = async (booking: AdminBookingItem, handler: (token: string) => Promise<void>) => {
    setActingId(booking.id);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await handler(token);
      await loadBookings();
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
  const inputClass = 'h-9 rounded-xl border border-border bg-card px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20';
  const deskPending = data.items.filter((item) => item.status === 'pending' && !item.isInstant).length;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Booking desk</h1>
          <p className="text-sm font-medium text-muted-foreground">
            Call the host or driver (cars, chauffeurs, taxi, airport trips), then confirm or reject. {deskPending} pending desk request{deskPending === 1 ? '' : 's'} on this page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={inputClass}
            value={filters.type ?? ''}
            onChange={(e) => {
              const v = e.target.value as '' | 'car' | 'driver' | 'all';
              setFilters((f) => ({ ...f, type: v || undefined, page: 1 }));
            }}
          >
            <option value="">All types</option>
            <option value="car">Car</option>
            <option value="driver">Driver</option>
            <option value="all">All</option>
          </select>
          <select
            className={inputClass}
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <input
            className={inputClass}
            value={filters.userId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value, page: 1 }))}
            placeholder="User ID"
            type="text"
          />
          <input
            className={inputClass}
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined, page: 1 }))}
          />
          <input
            className={inputClass}
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined, page: 1 }))}
          />
          <button
            type="button"
            className="h-9 rounded border border-border bg-brand px-4 text-sm font-black text-white shadow-brutal-sm hover:bg-brand-hover transition-all"
            onClick={() => void loadBookings()}
          >
            Filter
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 shadow-brutal-red">
          {error}
        </div>
      ) : null}

      {tryNextFor ? (
        <section className="rounded-2xl border border-border bg-[#fbf4e0] p-4 shadow-brutal">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-ink">Try next for {tryNextFor.summary}</h2>
              <p className="text-sm font-medium text-muted-foreground">
                {tryNextFor.renter.fullName} · {tryNextFor.renterPhone ?? tryNextFor.renter.phone ?? 'no phone'} · {formatWhen(tryNextFor.startsAt)}
              </p>
            </div>
            <button
              type="button"
              className="rounded border border-border px-3 py-1 text-xs font-black"
              onClick={() => { setTryNextFor(null); setAlternatives([]); }}
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
                    <p className="text-xs font-medium text-muted-foreground">{provider} · {meta}</p>
                    {phone ? <p className="mt-1 text-sm font-semibold">{phone}</p> : null}
                    <button
                      type="button"
                      className="mt-2 rounded border border-border bg-brand px-3 py-1 text-xs font-black text-white disabled:opacity-40"
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

      <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-brand text-white">
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">When</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right">Desk</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              ) : data.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 font-semibold text-muted-foreground text-center" colSpan={6}>
                    No bookings found.
                  </td>
                </tr>
              ) : (
                data.items.map((booking) => {
                  const clientPhone = booking.renterPhone || booking.renter.phone;
                  const providerPhone = booking.ownerOrDriver.whatsapp ?? booking.ownerOrDriver.phone;
                  const providerWaUrl = waHref(providerPhone, providerDeskWhatsAppText(booking));
                  const pendingDesk = booking.status === 'pending' && !booking.isInstant;
                  const planLabel = booking.isInstant || booking.fulfillment === 'instant' ? 'Instant' : 'Desk';
                  return (
                    <tr key={`${booking.bookingType}:${booking.id}`} className="border-t border-border hover:bg-brand-soft transition-colors align-top">
                      <td className="px-4 py-3">
                        <div className="font-bold text-ink">{booking.renter.fullName}</div>
                        {clientPhone ? (
                          <a className="text-xs font-bold text-sky-800" href={telHref(clientPhone) ?? undefined}>{clientPhone}</a>
                        ) : (
                          <div className="text-xs font-medium text-muted-foreground">No phone</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded border border-border px-2 py-0.5 text-[10px] font-black uppercase">
                          {booking.bookingType}
                        </span>
                        <div className="mt-1 font-semibold text-ink">{booking.summary}</div>
                        <div className="text-xs font-medium text-muted-foreground">{booking.ownerOrDriver.fullName}</div>
                        {booking.pickupAddress ? (
                          <div className="mt-1 text-xs text-muted-foreground">Pickup: {booking.pickupAddress}</div>
                        ) : null}
                        {booking.notes ? (
                          <div className="mt-1 text-xs text-muted-foreground">Note: {booking.notes}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{formatWhen(booking.startsAt)}</div>
                        <div className="text-xs text-muted-foreground">to {formatWhen(booking.endsAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded border px-2 py-0.5 text-xs font-black ${planLabel === 'Instant' ? 'border-sky-700 bg-sky-50 text-sky-900' : 'border-border bg-muted text-ink/80'}`}>
                          {planLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded border px-2 py-0.5 text-xs font-black capitalize ${STATUS_STYLE[booking.status] ?? 'bg-muted border-border text-ink/80'}`}>
                          {booking.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {providerPhone ? (
                            <a
                              href={telHref(providerPhone) ?? undefined}
                              className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-bold"
                            >
                              Call provider
                            </a>
                          ) : null}
                          {clientPhone ? (
                            <a
                              href={telHref(clientPhone) ?? undefined}
                              className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-bold"
                            >
                              Call client
                            </a>
                          ) : null}
                          {providerWaUrl ? (
                            <a
                              href={providerWaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-hill/40 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900"
                            >
                              WhatsApp provider
                            </a>
                          ) : null}
                          {waHref(clientPhone) ? (
                            <a
                              href={waHref(clientPhone) ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-bold"
                            >
                              WhatsApp client
                            </a>
                          ) : null}
                          {pendingDesk ? (
                            <>
                              <button
                                type="button"
                                className="rounded-full border border-hill/40 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 disabled:opacity-40"
                                disabled={actingId === booking.id}
                                onClick={() => void onConfirm(booking)}
                              >
                                Mark confirmed
                              </button>
                              <button
                                type="button"
                                className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-bold disabled:opacity-40"
                                disabled={actingId === booking.id}
                                onClick={() => void onOpenTryNext(booking)}
                              >
                                Try next
                              </button>
                              <button
                                type="button"
                                className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 disabled:opacity-40"
                                disabled={actingId === booking.id}
                                onClick={() => void onReject(booking)}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 shadow-brutal-xs hover:bg-red-100 disabled:opacity-40"
                              disabled={actingId === booking.id || ['completed', 'auto_completed', 'cancelled_admin', 'declined'].includes(booking.status)}
                              onClick={() => void onCancel(booking)}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted">
            <p className="text-sm font-semibold text-muted-foreground">
              Page {data.page} of {totalPages} · {data.total} total
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-sm font-bold shadow-brutal-xs transition disabled:opacity-40"
                disabled={data.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page ?? 1) - 1 }))}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-sm font-bold shadow-brutal-xs transition disabled:opacity-40"
                disabled={data.page >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page ?? 1) + 1) }))}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
