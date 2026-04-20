'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  cancelAdminBooking,
  listAdminBookings,
  type AdminBookingItem,
  type ListBookingsFilters,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';

const AUTH_ERROR_MSG =
  'Session not ready. Please refresh the page or sign out and sign in again.';

const STATUSES = [
  'pending',
  'confirmed',
  'active',
  'disputed',
  'completed',
  'auto_completed',
  'cancelled_admin',
  'cancelled_by_renter',
  'cancelled_by_owner',
  'declined',
  'auto_cancelled',
] as const;
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

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

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

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-sm text-muted-foreground">Oversight across car and driver bookings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border px-2 text-sm"
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
            className="h-9 rounded-md border px-2 text-sm"
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
          <input
            className="h-9 rounded-md border px-3 text-sm"
            value={filters.userId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value, page: 1 }))}
            placeholder="User ID"
            type="text"
          />
          <input
            className="h-9 rounded-md border px-3 text-sm"
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined, page: 1 }))}
          />
          <input
            className="h-9 rounded-md border px-3 text-sm"
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined, page: 1 }))}
          />
          <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-muted" onClick={() => void loadBookings()}>
            Filter
          </button>
        </div>
      </header>

      {error ? <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-xl border">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Summary</th>
                <th className="px-4 py-2 font-medium">Parties</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={5}>
                    Loading bookings...
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={5}>
                    No bookings found.
                  </td>
                </tr>
              ) : (
                data.items.map((booking) => (
                  <tr key={booking.id} className="border-t">
                    <td className="px-4 py-3">{booking.bookingType}</td>
                    <td className="px-4 py-3">{booking.summary}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{booking.ownerOrDriver.fullName}</div>
                      <div className="text-xs text-muted-foreground">{booking.renter.fullName}</div>
                    </td>
                    <td className="px-4 py-3">{booking.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          disabled={actingId === booking.id}
                          onClick={() => void onCancel(booking)}
                        >
                          Cancel booking
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
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {totalPages} ({data.total} total)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-sm disabled:opacity-50"
                disabled={data.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page ?? 1) - 1 }))}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-sm disabled:opacity-50"
                disabled={data.page >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page ?? 1) + 1) }))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
