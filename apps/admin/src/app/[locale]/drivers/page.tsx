'use client';

import { Download, Plus, RefreshCw, Trash2, X } from 'lucide-react';
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
import { TableRowSkeleton } from '@/components/ui/skeleton';

const DRIVER_CATEGORIES = ['city', 'outstation', 'airport', 'chauffeur', 'tour_guide', 'delivery'] as const;
const VEHICLE_TYPES = ['sedan', 'suv', 'hatchback', 'pickup', 'van', 'truck'] as const;
const LANGUAGES = ['en', 'fr', 'rw', 'sw'] as const;
const PAGE_SIZE = 20;

function exportDriversCsv(items: AdminDriverItem[]) {
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Category', 'Experience (yrs)', 'Daily Rate (RWF)', 'City', 'Status', 'Joined'];
  const rows = items.map((d) => [
    d.id, d.user.fullName, d.user.email, d.user.phone ?? '', d.driverCategory,
    String(d.yearsExperience), String(d.dailyRateRwf), d.primaryCity, d.user.status, new Date(d.createdAt).toISOString(),
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

const fieldClass = 'h-9 w-full rounded border-2 border-neutral-900 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400';

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border-2 border-neutral-900 px-2.5 py-1 text-xs font-bold transition-colors ${
        active ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'
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
    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-neutral-600">{text}</label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-md border-2 border-neutral-900 bg-white shadow-brutal">
        <div className="flex items-center justify-between border-b-2 border-neutral-900 px-6 py-4 bg-neutral-900">
          <h2 className="font-black text-white">Add Driver Profile</h2>
          <button type="button" onClick={onClose} className="rounded border-2 border-neutral-600 p-1.5 text-neutral-400 hover:border-white hover:text-white transition-colors">
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
                className="h-9 flex-1 rounded border-2 border-neutral-900 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={addArea}
                className="rounded border-2 border-neutral-900 bg-white px-3 text-sm font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {((form.serviceAreas as string[]) ?? []).map((a) => (
                <span key={a} className="flex items-center gap-1 rounded border-2 border-neutral-900 bg-amber-100 px-2 py-0.5 text-xs font-bold">
                  {a}
                  <button type="button" onClick={() => set('serviceAreas', ((form.serviceAreas as string[]) ?? []).filter((x) => x !== a))} className="text-neutral-500 hover:text-red-600">
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
              className="mt-1 w-full rounded border-2 border-neutral-900 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {error && (
            <div className="rounded border-2 border-red-700 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded border-2 border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-black text-white shadow-brutal-sm hover:bg-neutral-800 hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40"
            >
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
  const inputClass = 'h-9 rounded border-2 border-neutral-900 bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400';

  return (
    <main className="min-h-screen space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Drivers</h1>
          <p className="text-sm font-medium text-neutral-500 mt-0.5">Manage driver profiles on the platform.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            className="flex items-center gap-1.5 rounded border-2 border-neutral-900 bg-white px-3 py-2 text-sm font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void loadDrivers()}
            className="flex items-center gap-1.5 rounded border-2 border-neutral-900 bg-white px-3 py-2 text-sm font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAddDriver(true)}
            className="flex items-center gap-1.5 rounded border-2 border-neutral-900 bg-neutral-900 px-3 py-2 text-sm font-black text-white shadow-brutal-sm hover:bg-neutral-800 hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Driver
          </button>
        </div>
      </header>

      {showAddDriver && <AddDriverModal onClose={() => setShowAddDriver(false)} onCreated={() => void loadDrivers()} />}

      {error && (
        <div className="rounded border-2 border-red-700 bg-red-50 p-3 text-sm font-semibold text-red-700 shadow-[3px_3px_0_#991b1b]">{error}</div>
      )}

      <div className="rounded-md border-2 border-neutral-900 bg-white shadow-brutal overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-neutral-900 text-white">
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Driver</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Category</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Experience</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Daily Rate</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">City</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Joined</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : data.items.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center font-semibold text-neutral-400" colSpan={7}>
                    No driver profiles found.
                  </td>
                </tr>
              ) : (
                data.items.map((driver) => (
                  <tr key={driver.id} className="border-t-2 border-neutral-900 hover:bg-amber-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-bold text-neutral-900">{driver.user.fullName}</div>
                      <div className="text-xs font-medium text-neutral-500">{driver.user.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded border-2 border-neutral-900 px-2 py-0.5 text-xs font-black capitalize bg-white">
                        {driver.driverCategory.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-neutral-700">
                      {driver.yearsExperience} yr{driver.yearsExperience !== 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-neutral-900">
                      RWF {new Intl.NumberFormat('en-RW').format(driver.dailyRateRwf)}
                      <span className="text-xs font-normal text-neutral-500">/day</span>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-neutral-700">{driver.primaryCity}</td>
                    <td className="px-5 py-3 text-xs font-medium text-neutral-500">{new Date(driver.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={actingId === driver.id}
                          onClick={() => void onDelete(driver.id)}
                          className="rounded border-2 border-red-700 p-1.5 text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors"
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
          <div className="flex items-center justify-between border-t-2 border-neutral-900 px-4 py-3 bg-neutral-50">
            <p className="text-sm font-semibold text-neutral-500">Page {data.page} of {totalPages} · {data.total} total</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border-2 border-neutral-900 px-3 py-1.5 text-sm font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40"
                disabled={data.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
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
      </div>
    </main>
  );
}
