'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import {
  approveListing,
  listAdminListings,
  rejectListing,
  type AdminListingItem,
  type ListListingsFilters,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';

const STATUSES = ['pending_approval', 'active', 'draft', 'paused', 'rejected', 'archived'] as const;
const PAGE_SIZE = 20;

function fmt(n: number) {
  return new Intl.NumberFormat('en-RW').format(n);
}

export default function AdminListingsPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [data, setData] = useState<{ items: AdminListingItem[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [filters, setFilters] = useState<ListListingsFilters>({
    status: 'pending_approval',
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const response = await listAdminListings(token, {
        status: filters.status,
        page: filters.page,
        pageSize: PAGE_SIZE,
      });
      setData({ items: response.items, total: response.total, page: response.page });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load listings.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn, filters.page, filters.status]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const onApprove = async (listingId: string) => {
    setActingId(listingId);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await approveListing(token, listingId);
      await loadListings();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to approve listing.');
    } finally {
      setActingId(null);
    }
  };

  const onReject = async (listingId: string) => {
    const reason = window.prompt('Rejection reason (required, shown to owner):');
    if (!reason?.trim()) return;
    setActingId(listingId);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await rejectListing(token, listingId, reason.trim());
      await loadListings();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to reject listing.');
    } finally {
      setActingId(null);
    }
  };

  const totalPages = Math.ceil(data.total / PAGE_SIZE) || 1;
  const pendingCount = filters.status === 'pending_approval' ? data.total : null;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Listings
            {pendingCount != null && pendingCount > 0 ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-800">
                {pendingCount} pending
              </span>
            ) : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and approve car listings before they go live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={filters.status ?? 'pending_approval'}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => void loadListings()}
          >
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="rounded-xl border">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 font-medium">Listing</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 font-medium">Rate (Kigali)</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Submitted</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                    Loading listings…
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                    {filters.status === 'pending_approval'
                      ? 'No listings pending approval. You\'re all caught up!'
                      : 'No listings found.'}
                  </td>
                </tr>
              ) : (
                data.items.map((listing) => (
                  <tr key={listing.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {listing.photos[0] ? (
                          <Image
                            src={listing.photos[0]}
                            alt={listing.title}
                            width={56}
                            height={40}
                            className="h-10 w-14 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-14 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                            No photo
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{listing.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {listing.year} {listing.brand} {listing.model} ·{' '}
                            {listing.vehicleType.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{listing.owner.fullName}</div>
                      <div className="text-xs text-muted-foreground">{listing.owner.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{listing.locationText}</td>
                    <td className="px-4 py-3 text-sm">RWF {fmt(listing.dailyRateKigaliRwf)}/day</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          listing.status === 'pending_approval'
                            ? 'bg-amber-100 text-amber-800'
                            : listing.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : listing.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {listing.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {listing.status === 'pending_approval' ? (
                          <>
                            <button
                              type="button"
                              className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                              disabled={actingId === listing.id}
                              onClick={() => void onReject(listing.id)}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="rounded-md bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                              disabled={actingId === listing.id}
                              onClick={() => void onApprove(listing.id)}
                            >
                              {actingId === listing.id ? 'Approving…' : 'Approve'}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
