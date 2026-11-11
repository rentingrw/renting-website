'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { TableRowSkeleton } from '@/components/ui/skeleton';
import { listAdminTaxis, setAdminTaxiStatus, type AdminTaxiItem } from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';

const STATUSES = ['active', 'inactive', 'booked', 'pending', 'approved', 'rejected'] as const;
const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  inactive: 'bg-muted text-ink border-border',
  booked: 'bg-blue-100 text-blue-900 border-blue-300',
  pending: 'bg-amber-100 text-amber-900 border-amber-300',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-900 border-red-300',
};

export default function AdminTaxisPage() {
  const { fetchToken } = useAuthToken();
  const [items, setItems] = useState<AdminTaxiItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Not authenticated.');
      const data = await listAdminTaxis(token, { search: search.trim() || undefined, status: statusFilter || undefined, pageSize: 50 });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load taxis.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onStatusChange(taxi: AdminTaxiItem, next: string) {
    setBusyId(taxi.id);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Not authenticated.');
      await setAdminTaxiStatus(token, taxi.id, next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Taxi</h1>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
            Taxi drivers listed on renting.rw · {total} registered
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="h-10 min-w-[12rem] flex-1 rounded-xl border border-border bg-card px-3 text-sm font-semibold"
          placeholder="Search name, phone, city, plate…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void load()}
        />
        <select
          className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-semibold"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mb-4 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs font-black uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Work area</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={5} />
                ))
              : items.map((taxi) => (
                  <tr key={taxi.id} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{taxi.fullName}</p>
                      {taxi.user?.email ? <p className="text-xs text-muted-foreground">{taxi.user.email}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-ink/80">
                      {taxi.phone}
                      {taxi.whatsapp ? <span className="block text-xs">WA: {taxi.whatsapp}</span> : null}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-ink/80" title={taxi.workLocationText ?? taxi.city}>
                      {taxi.workLocationText ?? taxi.city}
                    </td>
                    <td className="px-4 py-3 text-ink/80">
                      {taxi.carModel ?? '—'}
                      {taxi.plate ? <span className="block text-xs">{taxi.plate}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        disabled={busyId === taxi.id}
                        className={`rounded border px-2 py-1 text-xs font-bold capitalize ${STATUS_BADGE[taxi.status] ?? 'border-border'}`}
                        value={taxi.status}
                        onChange={(e) => void onStatusChange(taxi, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No taxi drivers found.</p>
        ) : null}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Only <strong>active</strong> taxis appear in public search. Owners can set active, inactive, or booked from their dashboard.
      </p>
    </main>
  );
}
