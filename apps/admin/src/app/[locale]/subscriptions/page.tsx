'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  activateSubscription,
  deactivateSubscription,
  listAdminSubscriptions,
  type AdminSubscriptionItem,
  type ListSubscriptionsFilters,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';
import { TableRowSkeleton } from '@/components/ui/skeleton';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';

const STATUSES = ['active', 'cancelled', 'expired', 'unpaid', 'past_due', 'trialing'] as const;
const TIERS = ['free', 'standard', 'premium', 'business'] as const;
const PAGE_SIZE = 20;

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-900 border-emerald-400',
  trialing: 'bg-blue-100 text-blue-900 border-blue-400',
  cancelled: 'bg-neutral-100 text-neutral-600 border-neutral-400',
  expired: 'bg-neutral-100 text-neutral-600 border-neutral-400',
  unpaid: 'bg-red-100 text-red-800 border-red-400',
  past_due: 'bg-amber-100 text-amber-900 border-amber-400',
};

const TIER_STYLE: Record<string, string> = {
  business: 'bg-purple-100 text-purple-900 border-purple-400',
  premium: 'bg-amber-100 text-amber-900 border-amber-400',
  standard: 'bg-blue-100 text-blue-900 border-blue-400',
  free: 'bg-neutral-100 text-neutral-600 border-neutral-400',
};

export default function AdminSubscriptionsPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [data, setData] = useState<{ items: AdminSubscriptionItem[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [filters, setFilters] = useState<ListSubscriptionsFilters>({
    status: '',
    tier: '',
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const payload: ListSubscriptionsFilters = { page: filters.page, pageSize: PAGE_SIZE };
      if (filters.status) payload.status = filters.status;
      if (filters.tier) payload.tier = filters.tier;
      const response = await listAdminSubscriptions(token, payload);
      setData({ items: response.items, total: response.total, page: response.page });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn, filters.page, filters.status, filters.tier]);

  useEffect(() => { void loadSubscriptions(); }, [loadSubscriptions]);

  const onAction = async (id: string, action: 'activate' | 'deactivate') => {
    setActingId(id);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const reason = window.prompt(`${action === 'activate' ? 'Activation' : 'Deactivation'} reason (optional):`) ?? undefined;
      if (action === 'activate') {
        await activateSubscription(token, id, reason);
      } else {
        await deactivateSubscription(token, id, reason);
      }
      await loadSubscriptions();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Subscription action failed.');
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
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Subscriptions</h1>
          <p className="text-sm font-medium text-neutral-500">Manage owner plans, statuses, and renewals.</p>
        </div>
        <div className="flex gap-2">
          <select
            className={inputClass}
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className={inputClass}
            value={filters.tier ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, tier: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All tiers</option>
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            type="button"
            className="h-9 rounded border-2 border-neutral-900 bg-neutral-900 px-4 text-sm font-black text-white shadow-brutal-sm hover:bg-neutral-800 hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
            onClick={() => void loadSubscriptions()}
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
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Tier</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Renews</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
              ) : data.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 font-semibold text-neutral-400 text-center" colSpan={5}>
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                data.items.map((subscription) => (
                  <tr key={subscription.id} className="border-t-2 border-neutral-900 hover:bg-amber-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-neutral-900">{subscription.owner.fullName}</div>
                      <div className="text-xs font-medium text-neutral-500">{subscription.owner.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded border-2 px-2 py-0.5 text-xs font-black capitalize ${TIER_STYLE[subscription.tier] ?? 'bg-neutral-100 border-neutral-400 text-neutral-700'}`}>
                        {subscription.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded border-2 px-2 py-0.5 text-xs font-black capitalize ${STATUS_STYLE[subscription.status] ?? 'bg-neutral-100 border-neutral-400 text-neutral-700'}`}>
                        {subscription.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-600">
                      {subscription.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-xs font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40"
                          disabled={actingId === subscription.id}
                          onClick={() => void onAction(subscription.id, 'deactivate')}
                        >
                          Deactivate
                        </button>
                        <button
                          type="button"
                          className="rounded border-2 border-neutral-900 bg-neutral-900 px-2.5 py-1 text-xs font-black text-white shadow-brutal-xs hover:bg-neutral-800 disabled:opacity-40"
                          disabled={actingId === subscription.id}
                          onClick={() => void onAction(subscription.id, 'activate')}
                        >
                          Activate
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
