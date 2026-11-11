'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Eye, ImagePlus, Plus, RefreshCw, Trash2, X } from 'lucide-react';

import {
  adminCreateCar,
  adminGetUploadUrl,
  approveListing,
  deleteListing,
  listAdminListings,
  rejectListing,
  setAdminListingStatus,
  type AdminListingMarketplaceStatus,
  type AdminCreateCarPayload,
  type AdminListingItem,
  type ListListingsFilters,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';
import { Skeleton, TableRowSkeleton } from '@/components/ui/skeleton';
import { ListingReviewModal } from '@/components/listing-review-modal';

const VEHICLE_TYPES = ['sedan', 'suv', 'hatchback', 'pickup', 'van', 'truck'] as const;
const SERVICE_TYPES = ['self_drive', 'with_driver', 'private_driver', 'airport_transfer', 'corporate'] as const;
const STATUSES = ['pending_approval', 'active', 'inactive', 'booked', 'draft', 'rejected', 'archived'] as const;
const PAGE_SIZE = 20;

const STATUS_STYLE: Record<string, string> = {
  pending_approval: 'bg-sun text-ink border-amber-600',
  active: 'bg-emerald-100 text-emerald-900 border-emerald-400',
  inactive: 'bg-muted text-ink border-border',
  booked: 'bg-blue-100 text-blue-900 border-blue-400',
  rejected: 'bg-red-500 text-white border-red-700',
  draft: 'bg-muted text-muted-foreground border-border',
  paused: 'bg-muted text-ink border-border',
  archived: 'bg-muted text-muted-foreground border-border',
};

import { formatRwfPlain } from '@rentingi/types';

function adminVisibilitySelectValue(status: string): AdminListingMarketplaceStatus {
  if (status === 'active' || status === 'booked') return status;
  return 'inactive';
}

function exportCsv(items: AdminListingItem[]) {
  const headers = ['ID', 'Title', 'Brand', 'Model', 'Year', 'Vehicle Type', 'Service', 'Status', 'City', 'Location', 'Daily (in city)', 'Daily (outside)', 'Owner', 'Owner Email', 'Created'];
  const rows = items.map((l) => [
    l.id, l.title, l.brand, l.model, String(l.year), l.vehicleType, l.serviceType, l.status,
    l.listingCity, l.locationText, String(l.dailyRateInCityRwf), String(l.dailyRateOutsideCityRwf),
    l.owner.fullName, l.owner.email, new Date(l.createdAt).toISOString(),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `listings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function PhotoUploader({ token, photos, onChange }: { token: string; photos: string[]; onChange: (photos: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        const { uploadUrl, fields } = await adminGetUploadUrl(token, 'rentingi/cars');
        const fd = new FormData();
        Object.entries(fields).forEach(([k, v]) => fd.append(k, String(v)));
        fd.append('file', file);
        const res = await fetch(uploadUrl, {
          method: 'POST',
          body: fd,
          headers: uploadUrl.startsWith((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, ''))
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        });
        if (!res.ok) throw new Error('Upload failed — check Cloudinary configuration.');
        const data = await res.json() as { secure_url?: string };
        if (data.secure_url) newUrls.push(data.secure_url);
      }
      onChange([...photos, ...newUrls]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">Photos</label>
      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <div key={url} className="relative">
            <Image src={url} alt={`photo ${i + 1}`} width={72} height={52} className="h-13 w-18 rounded border border-border object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-red-600 text-white"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-13 w-18 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:border-solid hover:bg-brand-soft disabled:opacity-50 transition-colors"
        >
          {uploading ? <span className="text-[10px] font-bold">Uploading…</span> : <ImagePlus className="h-5 w-5" />}
        </button>
      </div>
      {uploadError && <p className="text-xs font-semibold text-red-700">{uploadError}</p>}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
    </div>
  );
}

const fieldClass = 'h-9 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20';

function AddCarModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { fetchToken } = useAuthToken();
  const [form, setForm] = useState<Partial<AdminCreateCarPayload & { photos: string[] }>>({
    vehicleType: 'sedan',
    serviceType: 'self_drive',
    seats: 5,
    photos: [],
  });
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchToken().then(setToken).catch(() => null); }, [fetchToken]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const t = await fetchToken();
      if (!t) throw new Error('Not authenticated.');
      await adminCreateCar(t, { ...form, photos: form.photos ?? [] } as AdminCreateCarPayload);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing.');
    } finally {
      setSaving(false);
    }
  };

  const textField = (label: string, key: string, required = true, type = 'text') => (
    <div>
      <label className="mb-1 block text-xs font-black uppercase tracking-wider text-muted-foreground">{label}{required && ' *'}</label>
      <input
        type={type}
        required={required}
        value={(form[key as keyof typeof form] as string | number) ?? ''}
        onChange={(e) => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        className={fieldClass}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-neutral-900">
          <div>
            <h2 className="font-black text-white">Add Car Listing</h2>
            <p className="text-xs font-medium text-muted-foreground">Create a listing on behalf of an owner</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/20 p-1.5 text-muted-foreground hover:border-white hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            {textField('Owner User ID', 'userId')}
            {textField('Listing Title', 'title')}
            {textField('Brand', 'brand')}
            {textField('Model', 'model')}
            {textField('Year', 'year', true, 'number')}
            {textField('Seats', 'seats', true, 'number')}
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-muted-foreground">Vehicle Type *</label>
              <select value={form.vehicleType ?? 'sedan'} onChange={(e) => set('vehicleType', e.target.value)} className={fieldClass}>
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-muted-foreground">Service Type *</label>
              <select value={form.serviceType ?? 'self_drive'} onChange={(e) => set('serviceType', e.target.value)} className={fieldClass}>
                {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            {textField('Daily — in listing city (RWF)', 'dailyRateInCityRwf', true, 'number')}
            {textField('Daily — outside city (RWF)', 'dailyRateOutsideCityRwf', true, 'number')}
            {textField('Weekly — in city (RWF)', 'weeklyRateInCityRwf', true, 'number')}
            {textField('Weekly — outside city (RWF)', 'weeklyRateOutsideCityRwf', true, 'number')}
            {textField('Monthly — in city (RWF)', 'monthlyRateInCityRwf', true, 'number')}
            {textField('Monthly — outside city (RWF)', 'monthlyRateOutsideCityRwf', true, 'number')}
            {textField('Listing city (optional)', 'listingCity', false)}
            {textField('Location', 'locationText')}
            {textField('Transmission', 'transmission', false)}
            {textField('Fuel Type', 'fuelType', false)}
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea
              rows={3}
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {token && (
            <PhotoUploader token={token} photos={form.photos ?? []} onChange={(p) => set('photos', p)} />
          )}

          {error && (
            <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              <X className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold shadow-brutal-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded border border-border bg-brand px-4 py-2 text-sm font-black text-white shadow-brutal-sm hover:bg-brand-hover transition disabled:opacity-40"
            >
              {saving ? 'Creating…' : (<><Plus className="h-4 w-4" /> Create Listing</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';

export default function AdminListingsPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [data, setData] = useState<{ items: AdminListingItem[]; total: number; page: number }>({ items: [], total: 0, page: 1 });
  const [filters, setFilters] = useState<ListListingsFilters>({ page: 1, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [showAddCar, setShowAddCar] = useState(false);
  const [reviewListingId, setReviewListingId] = useState<string | null>(null);
  const [reviewToken, setReviewToken] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const res = await listAdminListings(token, { status: filters.status || undefined, page: filters.page, pageSize: PAGE_SIZE });
      setData({ items: res.items, total: res.total, page: res.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn, filters.page, filters.status]);

  useEffect(() => { void loadListings(); }, [loadListings]);

  async function openReview(listingId: string) {
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      setReviewToken(token);
      setReviewListingId(listingId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open listing.');
    }
  }

  const onApprove = async (id: string) => {
    setActingId(id);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await approveListing(token, id);
      setReviewListingId(null);
      await loadListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve listing.');
    } finally { setActingId(null); }
  };

  const onReject = async (id: string, reason?: string) => {
    const rejectionReason = reason?.trim() || window.prompt('Rejection reason (required):')?.trim();
    if (!rejectionReason) return;
    setActingId(id);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await rejectListing(token, id, rejectionReason);
      setReviewListingId(null);
      await loadListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject listing.');
    } finally { setActingId(null); }
  };

  const onStatusChange = async (id: string, status: AdminListingMarketplaceStatus) => {
    setActingId(id);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await setAdminListingStatus(token, id, status);
      await loadListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update listing status.');
    } finally {
      setActingId(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this listing? This cannot be undone.')) return;
    setActingId(id);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await deleteListing(token, id);
      await loadListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete listing.');
    } finally { setActingId(null); }
  };

  const totalPages = Math.ceil(data.total / PAGE_SIZE) || 1;
  const inputClass = 'h-9 rounded-xl border border-border bg-card px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20';

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink">
            Cars
            {filters.status === 'pending_approval' && data.total > 0 && !loading && (
              <span className="rounded-full border border-sun/60 bg-sun px-2 py-0.5 text-sm font-black text-ink">
                {data.total} pending
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
            Review self-drive, with-driver, and airport delivery cars. Hosts keep 90% of each rental.
            {!loading ? (
              <span className="ml-2 font-black text-ink">{data.total} total</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={inputClass}
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All (excl. deleted)</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => exportCsv(data.items)}
            disabled={data.items.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold shadow-brutal-xs transition disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void loadListings()}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold shadow-brutal-xs transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAddCar(true)}
            className="flex items-center gap-1.5 rounded border border-border bg-brand px-3 py-2 text-sm font-black text-white shadow-brutal-sm hover:bg-brand-hover transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Car
          </button>
        </div>
      </div>

      {showAddCar && <AddCarModal onClose={() => setShowAddCar(false)} onCreated={() => void loadListings()} />}

      {reviewListingId && reviewToken ? (
        <ListingReviewModal
          listingId={reviewListingId}
          token={reviewToken}
          onClose={() => setReviewListingId(null)}
          onApprove={onApprove}
          onReject={onReject}
          onStatusChange={onStatusChange}
          acting={actingId !== null}
        />
      ) : null}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-brutal-red">{error}</div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-brand text-white">
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Listing</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Owner</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Location</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Daily (in city)</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Added</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-14 rounded" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-full max-w-[100px]" /></td>
                    ))}
                    <td className="px-5 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
                    <p className="text-sm font-semibold text-muted-foreground">
                      {filters.status === 'pending_approval' ? 'No listings pending approval — all clear!' : 'No listings found.'}
                    </p>
                  </td>
                </tr>
              ) : (
                data.items.map((listing) => (
                  <tr key={listing.id} className="border-t border-border hover:bg-brand-soft transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {listing.photos[0] ? (
                          <Image src={listing.photos[0]} alt={listing.title} width={56} height={40} className="h-10 w-14 rounded border border-border object-cover" />
                        ) : (
                          <div className="flex h-10 w-14 items-center justify-center rounded border border-border bg-muted text-[10px] font-bold text-muted-foreground">
                            No photo
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-ink">{listing.title}</div>
                          <div className="text-xs font-medium text-muted-foreground">
                            {listing.year} {listing.brand} {listing.model} · {listing.vehicleType.replace(/_/g, ' ')}
                            {listing.plateNumber ? ` · ${listing.plateNumber}` : ''}
                          </div>
                          <div className="text-[11px] font-medium text-muted-foreground">{listing.serviceType.replace(/_/g, ' ')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-ink">{listing.owner.fullName}</div>
                      <div className="text-xs font-medium text-muted-foreground">{listing.owner.email}</div>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-muted-foreground">
                      <div className="font-bold text-ink">{listing.listingCity}</div>
                      <div className="max-w-[200px] truncate text-xs text-muted-foreground" title={listing.locationText}>
                        {listing.locationText}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-ink">
                      RWF {formatRwfPlain(listing.dailyRateInCityRwf)}<span className="text-xs font-normal text-muted-foreground">/day · {listing.listingCity || '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded border px-2 py-0.5 text-xs font-black capitalize ${STATUS_STYLE[listing.status] ?? 'bg-muted border-border text-ink/80'}`}>
                        {listing.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-muted-foreground">{new Date(listing.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void openReview(listing.id)}
                          className="rounded-xl border border-border bg-card p-1.5 text-ink hover:bg-brand-soft"
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {listing.status === 'pending_approval' && (
                          <>
                            <button
                              type="button"
                              disabled={actingId === listing.id}
                              onClick={() => void onReject(listing.id)}
                              className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              disabled={actingId === listing.id}
                              onClick={() => void onApprove(listing.id)}
                              className="rounded border border-hill/40 bg-emerald-600 px-2.5 py-1 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-40 shadow-brutal-xs transition-all"
                            >
                              {actingId === listing.id ? '…' : 'Approve'}
                            </button>
                          </>
                        )}
                        {listing.status !== 'deleted' && listing.status !== 'archived' ? (
                          <select
                            className="h-8 max-w-[6.5rem] rounded-xl border border-border bg-card px-1 text-[10px] font-black uppercase"
                            value={adminVisibilitySelectValue(listing.status)}
                            disabled={actingId === listing.id}
                            onChange={(event) =>
                              void onStatusChange(listing.id, event.target.value as AdminListingMarketplaceStatus)
                            }
                            title="Visibility on website"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="booked">Booked</option>
                          </select>
                        ) : null}
                        <button
                          type="button"
                          disabled={actingId === listing.id}
                          onClick={() => void onDelete(listing.id)}
                          className="rounded border border-red-200 p-1.5 text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          title="Delete listing"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
          <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted">
            <p className="text-sm font-semibold text-muted-foreground">Page {data.page} of {totalPages} · {data.total} total</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-sm font-bold shadow-brutal-xs transition disabled:opacity-40"
                disabled={data.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-sm font-bold shadow-brutal-xs transition disabled:opacity-40"
                disabled={data.page >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
