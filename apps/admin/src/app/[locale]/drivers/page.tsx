'use client';

import { Download, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  adminCreateDriver,
  approveDriverApplication,
  deleteDriver,
  getAdminDriverDetail,
  listAdminDrivers,
  rejectDriverApplication,
  type AdminCreateDriverPayload,
  type AdminDriverDetail,
  type AdminDriverItem,
  type ListDriversFilters,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';
import { TableRowSkeleton } from '@/components/ui/skeleton';

const DRIVER_CATEGORIES = ['city', 'outstation', 'airport', 'chauffeur', 'tour_guide', 'delivery'] as const;
const VEHICLE_TYPES = ['sedan', 'suv', 'hatchback', 'pickup', 'van', 'truck'] as const;
const LANGUAGES = ['en', 'fr', 'rw', 'sw'] as const;
const APPROVAL_STATUSES = ['pending_approval', 'approved', 'rejected', 'draft'] as const;
const STATUS_BADGE: Record<string, string> = {
  pending_approval: 'bg-sun text-ink border-amber-600',
  approved: 'bg-emerald-400 text-ink border-emerald-700',
  rejected: 'bg-red-200 text-red-900 border-red-700',
  draft: 'bg-muted text-ink/80 border-border',
};
const PAGE_SIZE = 20;

function formatRwf(value: number) {
  return new Intl.NumberFormat('en-RW').format(value);
}

function exportDriversCsv(items: AdminDriverItem[]) {
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Category', 'Experience (yrs)', 'Daily Rate (RWF)', 'City', 'Status', 'Joined'];
  const rows = items.map((d) => [
    d.id, d.user.fullName, d.user.email, d.user.phone ?? '', d.driverCategory,
    String(d.yearsExperience), String(d.dailyRateRwf), d.primaryCity, d.status ?? 'draft', new Date(d.createdAt).toISOString(),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drivers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const fieldClass = 'h-9 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20';

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border border-border px-2.5 py-1 text-xs font-bold transition-colors ${
        active ? 'bg-brand text-white' : 'bg-white text-ink/80 hover:bg-brand-soft'
      }`}
    >
      {children}
    </button>
  );
}

function AddDriverModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { fetchToken } = useAuthToken();
  const [form, setForm] = useState<Partial<AdminCreateDriverPayload>>({
    driverCategory: 'city',
    yearsExperience: 0,
    languages: ['en'],
    categories: ['city'],
    vehicleTypes: ['sedan'],
    serviceAreas: [],
  });
  const [serviceAreaInput, setServiceAreaInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof AdminCreateDriverPayload, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggleArr = (key: 'languages' | 'categories' | 'vehicleTypes', val: string) => {
    const arr = (form[key] as string[]) ?? [];
    set(key, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const addArea = () => {
    const v = serviceAreaInput.trim();
    if (!v) return;
    set('serviceAreas', [...((form.serviceAreas as string[]) ?? []), v]);
    setServiceAreaInput('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Not authenticated.');
      await adminCreateDriver(token, form as AdminCreateDriverPayload);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create driver.');
    } finally {
      setSaving(false);
    }
  };

  const label = (text: string) => (
    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-muted-foreground">{text}</label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-neutral-900">
          <h2 className="font-black text-white">Add Driver Profile</h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/20 p-1.5 text-muted-foreground hover:border-white hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              {label('User ID *')}
              <input required value={form.userId ?? ''} onChange={(e) => set('userId', e.target.value)} className={fieldClass} />
            </div>
            <div>
              {label('Category *')}
              <select value={form.driverCategory ?? 'city'} onChange={(e) => set('driverCategory', e.target.value)} className={fieldClass}>
                {DRIVER_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              {label('Years Experience *')}
              <input type="number" min={0} max={80} required value={form.yearsExperience ?? 0} onChange={(e) => set('yearsExperience', Number(e.target.value))} className={fieldClass} />
            </div>
            <div>
              {label('Daily Rate (RWF) *')}
              <input type="number" min={1000} required value={form.dailyRateRwf ?? ''} onChange={(e) => set('dailyRateRwf', Number(e.target.value))} className={fieldClass} />
            </div>
            <div>
              {label('Primary City *')}
              <input required value={form.primaryCity ?? ''} onChange={(e) => set('primaryCity', e.target.value)} className={fieldClass} />
            </div>
            <div>
              {label('Hourly Rate (RWF)')}
              <input type="number" min={1000} value={form.hourlyRateRwf ?? ''} onChange={(e) => set('hourlyRateRwf', e.target.value ? Number(e.target.value) : undefined)} className={fieldClass} />
            </div>
          </div>

          <div>
            {label('Languages *')}
            <div className="flex flex-wrap gap-2 mt-1">
              {LANGUAGES.map((l) => (
                <ToggleBtn key={l} active={(form.languages as string[])?.includes(l)} onClick={() => toggleArr('languages', l)}>
                  {l.toUpperCase()}
                </ToggleBtn>
              ))}
            </div>
          </div>

          <div>
            {label('Service Categories *')}
            <div className="flex flex-wrap gap-2 mt-1">
              {DRIVER_CATEGORIES.map((c) => (
                <ToggleBtn key={c} active={(form.categories as string[])?.includes(c)} onClick={() => toggleArr('categories', c)}>
                  {c.replace('_', ' ')}
                </ToggleBtn>
              ))}
            </div>
          </div>

          <div>
            {label('Vehicle Types *')}
            <div className="flex flex-wrap gap-2 mt-1">
              {VEHICLE_TYPES.map((v) => (
                <ToggleBtn key={v} active={(form.vehicleTypes as string[])?.includes(v)} onClick={() => toggleArr('vehicleTypes', v)}>
                  {v}
                </ToggleBtn>
              ))}
            </div>
          </div>

          <div>
            {label('Service Areas *')}
            <div className="flex gap-2 mt-1">
              <input
                value={serviceAreaInput}
                onChange={(e) => setServiceAreaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArea(); } }}
                placeholder="e.g. Kigali"
                className="h-9 flex-1 rounded-xl border border-border bg-card px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="button"
                onClick={addArea}
                className="rounded-xl border border-border bg-card px-3 text-sm font-bold shadow-brutal-xs transition-all"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {((form.serviceAreas as string[]) ?? []).map((a) => (
                <span key={a} className="flex items-center gap-1 rounded border border-border bg-amber-100 px-2 py-0.5 text-xs font-bold">
                  {a}
                  <button type="button" onClick={() => set('serviceAreas', ((form.serviceAreas as string[]) ?? []).filter((x) => x !== a))} className="text-muted-foreground hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            {label('Biography')}
            <textarea
              rows={3}
              value={form.biography ?? ''}
              onChange={(e) => set('biography', e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
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
              className="rounded border border-border bg-brand px-4 py-2 text-sm font-black text-white shadow-brutal-sm hover:bg-brand-hover transition disabled:opacity-40"
            >
              {saving ? 'Creating…' : 'Create Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DriverReviewModal({
  driverId,
  onClose,
  onUpdated,
}: {
  driverId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { fetchToken } = useAuthToken();
  const [detail, setDetail] = useState<AdminDriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await fetchToken();
        if (!token) throw new Error('Not authenticated.');
        const data = await getAdminDriverDetail(token, driverId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load application.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId, fetchToken]);

  const onApprove = async () => {
    setActing(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Not authenticated.');
      await approveDriverApplication(token, driverId);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed.');
    } finally {
      setActing(false);
    }
  };

  const onReject = async () => {
    if (!rejectReason.trim()) {
      setError('Enter a rejection reason for the driver.');
      return;
    }
    setActing(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Not authenticated.');
      await rejectDriverApplication(token, driverId, rejectReason.trim());
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setActing(false);
    }
  };

  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-3 gap-2 border-b border-neutral-200 py-2 text-sm">
      <dt className="font-black uppercase text-xs text-muted-foreground">{label}</dt>
      <dd className="col-span-2 font-semibold text-ink">{value}</dd>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border bg-brand px-6 py-4">
          <h2 className="font-black text-white">Driver application</h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/20 p-1.5 text-muted-foreground hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          {loading ? <p className="text-sm font-semibold text-muted-foreground">Loading…</p> : null}
          {error ? <p className="mb-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {detail ? (
            <dl>
              {row('Status', detail.status ?? '—')}
              {row('Name', detail.user.fullName)}
              {row('Email', detail.user.email)}
              {row('Phone', detail.user.phone ?? '—')}
              {row('Address', detail.addressText ?? detail.primaryCity)}
              {row('License categories', (detail.licenseCategories ?? []).join(', ') || '—')}
              {row('Transmission', detail.transmission ?? '—')}
              {row('Experience', `${detail.yearsExperience} years`)}
              {row(
                'Rates',
                [
                  detail.dailyRateRwf ? `${formatRwf(Number(detail.dailyRateRwf))} RWF / day` : null,
                  detail.monthlyRateRwf ? `${formatRwf(Number(detail.monthlyRateRwf))} RWF / month` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—',
              )}
              {row('Languages', (detail.languages ?? []).join(', ') || '—')}
              {row('Certifications', (detail.certifications ?? []).join(' · ') || '—')}
              <div className="grid grid-cols-2 gap-4 pt-4">
                {detail.idDocumentUrl ? (
                  <div>
                    <p className="mb-1 text-xs font-black uppercase text-muted-foreground">National ID</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detail.idDocumentUrl} alt="National ID" className="max-h-48 w-full rounded border border-border object-contain" />
                  </div>
                ) : null}
                {detail.licenseDocumentUrl ? (
                  <div>
                    <p className="mb-1 text-xs font-black uppercase text-muted-foreground">Driving license</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detail.licenseDocumentUrl} alt="License" className="max-h-48 w-full rounded border border-border object-contain" />
                  </div>
                ) : null}
                {detail.user.avatarUrl ? (
                  <div>
                    <p className="mb-1 text-xs font-black uppercase text-muted-foreground">Profile photo</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detail.user.avatarUrl} alt="Profile" className="max-h-48 w-full rounded border border-border object-cover" />
                  </div>
                ) : null}
              </div>
            </dl>
          ) : null}
        </div>
        {detail?.status === 'pending_approval' ? (
          <div className="space-y-3 border-t border-border bg-muted p-4">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason (required if rejecting)"
              className="min-h-[72px] w-full rounded border border-border px-3 py-2 text-sm font-medium"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={acting}
                onClick={() => void onReject()}
                className="rounded border border-red-200 bg-card px-4 py-2 text-sm font-black text-red-700"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => void onApprove()}
                className="rounded border border-border bg-emerald-400 px-4 py-2 text-sm font-black text-ink shadow-brutal-xs"
              >
                Approve
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminDriversPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [data, setData] = useState<{ items: AdminDriverItem[]; total: number; page: number }>({ items: [], total: 0, page: 1 });
  const [filters, setFilters] = useState<ListDriversFilters>({ search: '', status: 'pending_approval', page: 1, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const loadDrivers = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Session not ready.');
      const res = await listAdminDrivers(token, {
        search: filters.search,
        status: filters.status,
        page: filters.page,
        pageSize: PAGE_SIZE,
      });
      setData({ items: res.items, total: res.total, page: res.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn, filters.search, filters.status, filters.page]);

  useEffect(() => { void loadDrivers(); }, [loadDrivers]);

  const onDelete = async (driverProfileId: string) => {
    if (!window.confirm('Remove this driver profile? This cannot be undone.')) return;
    setActingId(driverProfileId);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Session not ready.');
      await deleteDriver(token, driverProfileId);
      await loadDrivers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete driver.');
    } finally {
      setActingId(null);
    }
  };

  const totalPages = Math.ceil(data.total / PAGE_SIZE) || 1;
  const inputClass = 'h-9 rounded-xl border border-border bg-card px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20';

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Drivers</h1>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
            Approve chauffeurs for city, outstation, airport, and tour work. Drivers keep 90% of each booking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.status ?? 'pending_approval'}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            className={inputClass}
          >
            {APPROVAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search by name or email…"
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => exportDriversCsv(data.items)}
            disabled={data.items.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold shadow-brutal-xs transition disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void loadDrivers()}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold shadow-brutal-xs transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAddDriver(true)}
            className="flex items-center gap-1.5 rounded border border-border bg-brand px-3 py-2 text-sm font-black text-white shadow-brutal-sm hover:bg-brand-hover transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Driver
          </button>
        </div>
      </header>

      {showAddDriver && <AddDriverModal onClose={() => setShowAddDriver(false)} onCreated={() => void loadDrivers()} />}
      {reviewId ? (
        <DriverReviewModal driverId={reviewId} onClose={() => setReviewId(null)} onUpdated={() => void loadDrivers()} />
      ) : null}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 shadow-brutal-red">{error}</div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-brand text-white">
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Driver</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Category</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Experience</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Daily Rate</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">City</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Joined</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
              ) : data.items.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center font-semibold text-muted-foreground" colSpan={8}>
                    {filters.status === 'pending_approval' ? 'No pending driver applications.' : 'No driver profiles found.'}
                  </td>
                </tr>
              ) : (
                data.items.map((driver) => (
                  <tr key={driver.id} className="border-t border-border hover:bg-brand-soft transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-bold text-ink">{driver.user.fullName}</div>
                      <div className="text-xs font-medium text-muted-foreground">{driver.user.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded border border-border px-2 py-0.5 text-xs font-black capitalize bg-white">
                        {driver.driverCategory.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-ink/80">
                      {driver.yearsExperience} yr{driver.yearsExperience !== 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-ink">
                      RWF {new Intl.NumberFormat('en-RW').format(driver.dailyRateRwf)}
                      <span className="text-xs font-normal text-muted-foreground">/day</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-black capitalize ${STATUS_BADGE[driver.status ?? 'draft'] ?? STATUS_BADGE.draft}`}
                      >
                        {(driver.status ?? 'draft').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-ink/80">{driver.primaryCity}</td>
                    <td className="px-5 py-3 text-xs font-medium text-muted-foreground">{new Date(driver.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewId(driver.id)}
                          className="rounded border border-border bg-sun px-2 py-1 text-xs font-black shadow-brutal-xs"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          disabled={actingId === driver.id}
                          onClick={() => void onDelete(driver.id)}
                          className="rounded border border-red-200 p-1.5 text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          title="Remove driver"
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
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted">
            <p className="text-sm font-semibold text-muted-foreground">Page {data.page} of {totalPages} · {data.total} total</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-sm font-bold shadow-brutal-xs transition disabled:opacity-40"
                disabled={data.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
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
      </div>
    </main>
  );
}
