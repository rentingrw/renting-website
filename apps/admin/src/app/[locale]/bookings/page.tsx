'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  cancelAdminBooking,
  listAdminBookings,
  type AdminBookingItem,
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
  completed: 'bg-neutral-100 text-neutral-700 border-neutral-400',
  auto_completed: 'bg-neutral-100 text-neutral-700 border-neutral-400',
};

const PAGE_SIZE = 20;

export default function AdminBookingsPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [data, setData] = useState<{ items: AdminBookingItem[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [filters, setFilters] = useState<ListBookingsFilters>({
    type: undefined,
    status: undefined,
    userId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

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

  const onCancel = async (booking: AdminBookingItem) => {
    setActingId(booking.id);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const reason = window.prompt('Cancellation reason (optional):') ?? undefined;
      await cancelAdminBooking(token, booking.bookingType, booking.id, reason);
      await loadBookings();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to cancel booking.');
    } finally {
      setActingId(null);
    }
  };

  const totalPages = Math.ceil(data.total / PAGE_SIZE) || 1;
  const inputClass = 'h-9 rounded border-2 border-neutral-900 bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400';

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Bookings</h1>
          <p className="text-sm font-medium text-neutral-500">Oversight across car and driver bookings.</p>
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
            className="h-9 rounded border-2 border-neutral-900 bg-neutral-900 px-4 text-sm font-black text-white shadow-brutal-sm hover:bg-neutral-800 hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
            onClick={() => void loadBookings()}
          >
            Filter
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded border-2 border-red-700 bg-red-50 p-3 text-sm font-semibold text-red-700 shadow-[3px_3px_0_#991b1b]">
          {error}
        </div>
      ) : null}

      <section className="rounded-md border-2 border-neutral-900 bg-white shadow-brutal overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-neutral-900 text-white">
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Summary</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Parties</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
              ) : data.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 font-semibold text-neutral-400 text-center" colSpan={5}>
                    No bookings found.
                  </td>
                </tr>
              ) : (
                data.items.map((booking) => (
                  <tr key={booking.id} className="border-t-2 border-neutral-900 hover:bg-amber-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="rounded border-2 border-neutral-900 px-2 py-0.5 text-xs font-black uppercase">
                        {booking.bookingType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{booking.summary}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-neutral-900">{booking.ownerOrDriver.fullName}</div>
                      <div className="text-xs font-medium text-neutral-500">{booking.renter.fullName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded border-2 px-2 py-0.5 text-xs font-black capitalize ${STATUS_STYLE[booking.status] ?? 'bg-neutral-100 border-neutral-400 text-neutral-700'}`}>
                        {booking.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="rounded border-2 border-red-700 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 shadow-brutal-xs hover:bg-red-100 hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40"
                          disabled={actingId === booking.id}
                          onClick={() => void onCancel(booking)}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t-2 border-neutral-900 px-4 py-3 bg-neutral-50">
            <p className="text-sm font-semibold text-neutral-500">
              Page {data.page} of {totalPages} · {data.total} total
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border-2 border-neutral-900 px-3 py-1.5 text-sm font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40"
                disabled={data.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page ?? 1) - 1 }))}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="rounded border-2 border-neutral-900 px-3 py-1.5 text-sm font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40"
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
