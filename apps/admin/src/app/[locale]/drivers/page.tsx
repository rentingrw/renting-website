'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  adminCreateDriver,
  deleteDriver,
  listAdminDrivers,
  type AdminCreateDriverPayload,
  type AdminDriverItem,
  type ListDriversFilters,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';

const DRIVER_CATEGORIES = ['standard', 'professional', 'vip', 'chauffeur'] as const;
const VEHICLE_TYPES = ['sedan', 'suv', 'hatchback', 'pickup', 'van', 'minibus', 'bus'] as const;
const LANGUAGES = ['en', 'fr', 'rw', 'sw'] as const;
const PAGE_SIZE = 20;

function AddDriverModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { fetchToken } = useAuthToken();
  const [form, setForm] = useState<Partial<AdminCreateDriverPayload>>({
    driverCategory: 'standard',
    yearsExperience: 0,
    languages: ['en'],
    categories: ['standard'],
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold">Add Driver Profile</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium">User ID *</label>
              <input required value={form.userId ?? ''} onChange={(e) => set('userId', e.target.value)} className="h-9 w-full rounded border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Category *</label>
              <select value={form.driverCategory ?? 'standard'} onChange={(e) => set('driverCategory', e.target.value)} className="h-9 w-full rounded border px-2 text-sm">
                {DRIVER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Years Experience *</label>
              <input type="number" min={0} max={80} required value={form.yearsExperience ?? 0} onChange={(e) => set('yearsExperience', Number(e.target.value))} className="h-9 w-full rounded border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Daily Rate (RWF) *</label>
              <input type="number" min={1000} required value={form.dailyRateRwf ?? ''} onChange={(e) => set('dailyRateRwf', Number(e.target.value))} className="h-9 w-full rounded border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Primary City *</label>
              <input required value={form.primaryCity ?? ''} onChange={(e) => set('primaryCity', e.target.value)} className="h-9 w-full rounded border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Hourly Rate (RWF)</label>
              <input type="number" min={1000} value={form.hourlyRateRwf ?? ''} onChange={(e) => set('hourlyRateRwf', e.target.value ? Number(e.target.value) : undefined)} className="h-9 w-full rounded border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Languages *</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button key={l} type="button" onClick={() => toggleArr('languages', l)}
                  className={`rounded border px-2 py-1 text-xs ${(form.languages as string[])?.includes(l) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Vehicle Types *</label>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map((v) => (
                <button key={v} type="button" onClick={() => toggleArr('vehicleTypes', v)}
                  className={`rounded border px-2 py-1 text-xs ${(form.vehicleTypes as string[])?.includes(v) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Service Areas *</label>
            <div className="flex gap-2">
              <input value={serviceAreaInput} onChange={(e) => setServiceAreaInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArea(); } }} placeholder="e.g. Kigali" className="h-9 flex-1 rounded border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <button type="button" onClick={addArea} className="rounded border px-3 text-sm hover:bg-muted">Add</button>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {((form.serviceAreas as string[]) ?? []).map((a) => (
                <span key={a} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {a}
                  <button type="button" onClick={() => set('serviceAreas', ((form.serviceAreas as string[]) ?? []).filter((x) => x !== a))} className="text-muted-foreground hover:text-foreground">✕</button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Biography</label>
            <textarea rows={3} value={form.biography ?? ''} onChange={(e) => set('biography', e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDriversPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [data, setData] = useState<{ items: AdminDriverItem[]; total: number; page: number }>({ items: [], total: 0, page: 1 });
  const [filters, setFilters] = useState<ListDriversFilters>({ search: '', page: 1, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [showAddDriver, setShowAddDriver] = useState(false);

  const loadDrivers = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Session not ready.');
      const res = await listAdminDrivers(token, { search: filters.search, page: filters.page, pageSize: PAGE_SIZE });
      setData({ items: res.items, total: res.total, page: res.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn, filters.search, filters.page]);

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

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Drivers</h1>
          <p className="text-sm text-muted-foreground">Manage all driver profiles on the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search by name or email…"
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            className="h-9 rounded-md border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-muted" onClick={() => void loadDrivers()}>Refresh</button>
          <button type="button" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90" onClick={() => setShowAddDriver(true)}>+ Add Driver</button>
        </div>
      </header>

      {showAddDriver && <AddDriverModal onClose={() => setShowAddDriver(false)} onCreated={() => void loadDrivers()} />}

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-xl border">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 font-medium">Driver</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Experience</th>
                <th className="px-4 py-2 font-medium">Daily Rate</th>
                <th className="px-4 py-2 font-medium">City</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>Loading drivers…</td></tr>
              ) : data.items.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>No driver profiles found.</td></tr>
              ) : data.items.map((driver) => (
                <tr key={driver.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{driver.user.fullName}</div>
                    <div className="text-xs text-muted-foreground">{driver.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">{driver.driverCategory}</td>
                  <td className="px-4 py-3 text-sm">{driver.yearsExperience} yr{driver.yearsExperience !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-3 text-sm">RWF {new Intl.NumberFormat('en-RW').format(driver.dailyRateRwf)}/day</td>
                  <td className="px-4 py-3 text-sm">{driver.primaryCity}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(driver.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={actingId === driver.id}
                        onClick={() => void onDelete(driver.id)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {actingId === driver.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">Page {data.page} of {totalPages} ({data.total} total)</p>
            <div className="flex gap-2">
              <button type="button" className="rounded-md border px-2 py-1 text-sm disabled:opacity-50" disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}>Previous</button>
              <button type="button" className="rounded-md border px-2 py-1 text-sm disabled:opacity-50" disabled={data.page >= totalPages} onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page ?? 1) + 1) }))}>Next</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
