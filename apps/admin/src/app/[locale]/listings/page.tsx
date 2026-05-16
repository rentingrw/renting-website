'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import {
  adminCreateCar,
  approveListing,
  deleteListing,
  listAdminListings,
  rejectListing,
  type AdminCreateCarPayload,
  type AdminListingItem,
  type ListListingsFilters,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';

const VEHICLE_TYPES = ['sedan', 'suv', 'hatchback', 'pickup', 'van', 'minibus', 'bus', 'coupe', 'convertible', 'wagon', 'truck'] as const;
const SERVICE_TYPES = ['self_drive', 'chauffeur', 'both'] as const;

function AddCarModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { fetchToken } = useAuthToken();
  const [form, setForm] = useState<Partial<AdminCreateCarPayload>>({ vehicleType: 'sedan', serviceType: 'self_drive', seats: 5 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof AdminCreateCarPayload, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Not authenticated.');
      await adminCreateCar(token, form as AdminCreateCarPayload);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing.');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof AdminCreateCarPayload, type = 'text', required = true) => (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}{required && ' *'}</label>
      <input
        type={type}
        required={required}
        value={(form[key] as string | number) ?? ''}
        onChange={(e) => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="h-9 w-full rounded border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold">Add Car Listing</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="max-h-[70vh] overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            {field('Owner User ID', 'userId')}
            {field('Listing Title', 'title')}
            {field('Brand', 'brand')}
            {field('Model', 'model')}
            {field('Year', 'year', 'number')}
            {field('Seats', 'seats', 'number')}
            <div>
              <label className="mb-1 block text-xs font-medium">Vehicle Type *</label>
              <select value={form.vehicleType ?? 'sedan'} onChange={(e) => set('vehicleType', e.target.value)} className="h-9 w-full rounded border px-2 text-sm">
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Service Type *</label>
              <select value={form.serviceType ?? 'self_drive'} onChange={(e) => set('serviceType', e.target.value)} className="h-9 w-full rounded border px-2 text-sm">
                {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            {field('Daily Rate Kigali (RWF)', 'dailyRateKigaliRwf', 'number')}
            {field('Daily Rate Countryside (RWF)', 'dailyRateCountrysideRwf', 'number')}
            {field('Location Text', 'locationText')}
            {field('Transmission', 'transmission', 'text', false)}
            {field('Fuel Type', 'fuelType', 'text', false)}
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium">Description</label>
            <textarea
              rows={3}
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [showAddCar, setShowAddCar] = useState(false);

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

  const onDelete = async (listingId: string) => {
    if (!window.confirm('Permanently delete this listing? This cannot be undone.')) return;
    setActingId(listingId);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await deleteListing(token, listingId);
      await loadListings();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to delete listing.');
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
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
            onClick={() => setShowAddCar(true)}
          >
            + Add Car
          </button>
        </div>
      </header>
      {showAddCar && <AddCarModal onClose={() => setShowAddCar(false)} onCreated={() => void loadListings()} />}

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
                        {listing.status === 'pending_approval' && (
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
                        )}
                        <button
                          type="button"
                          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                          disabled={actingId === listing.id}
                          onClick={() => void onDelete(listing.id)}
                        >
                          Delete
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
