'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  dismissDispute,
  listAdminDisputes,
  resolveDispute,
  type AdminDisputeItem,
  type ListDisputesFilters,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';
import { TableRowSkeleton } from '@/components/ui/skeleton';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';

const STATUSES = ['open', 'under_review', 'waiting_evidence', 'escalated', 'resolved', 'rejected'] as const;
const PAGE_SIZE = 20;

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-red-500 text-white border-red-700',
  medium: 'bg-amber-400 text-neutral-900 border-amber-600',
  low: 'bg-blue-100 text-blue-900 border-blue-300',
};

export default function AdminDisputesPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const [data, setData] = useState<{ items: AdminDisputeItem[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [filters, setFilters] = useState<ListDisputesFilters>({
    openOnly: true,
    status: '',
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadDisputes = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const payload: ListDisputesFilters = { page: filters.page, pageSize: PAGE_SIZE };
      payload.openOnly = filters.openOnly ?? true;
      if (filters.status) payload.status = filters.status;
      const response = await listAdminDisputes(token, payload);
      setData({ items: response.items, total: response.total, page: response.page });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load disputes.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn, filters.page, filters.openOnly, filters.status]);

  useEffect(() => { void loadDisputes(); }, [loadDisputes]);

  const onAction = async (disputeId: string, action: 'resolve' | 'dismiss') => {
    setActingId(disputeId);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      if (action === 'resolve') {
        await resolveDispute(token, disputeId, {
          bookingOutcome: 'cancelled_admin',
          resolutionNote: 'Resolved from dispute list.',
        });
      } else {
        await dismissDispute(token, disputeId, 'Dismissed from dispute list.');
      }
      await loadDisputes();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to apply dispute action.');
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
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Disputes</h1>
          <p className="text-sm font-medium text-neutral-500">Review open disputes and take moderation actions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.openOnly ?? true}
              onChange={(e) => setFilters((f) => ({ ...f, openOnly: e.target.checked, page: 1 }))}
              className="h-4 w-4 rounded border-2 border-neutral-900 accent-amber-400"
            />
            <span className="text-sm font-bold">Open only</span>
          </label>
          <select
            className={inputClass}
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <button
            type="button"
            className="h-9 rounded border-2 border-neutral-900 bg-neutral-900 px-4 text-sm font-black text-white shadow-brutal-sm hover:bg-neutral-800 hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
            onClick={() => void loadDisputes()}
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
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Parties</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
              ) : data.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 font-semibold text-neutral-400 text-center" colSpan={5}>
                    No disputes found.
                  </td>
                </tr>
              ) : (
                data.items.map((dispute) => (
                  <tr key={dispute.id} className="border-t-2 border-neutral-900 hover:bg-amber-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`rounded border-2 px-2 py-0.5 text-xs font-black capitalize ${PRIORITY_STYLE[dispute.priority] ?? 'bg-neutral-100 border-neutral-400 text-neutral-700'}`}>
                        {dispute.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{dispute.reason}</td>
                    <td className="px-4 py-3 text-neutral-600 font-medium">
                      {dispute.openedBy.fullName} <span className="font-black text-xs">vs</span> {dispute.againstUser.fullName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded border-2 border-neutral-900 px-2 py-0.5 text-xs font-bold capitalize">
                        {dispute.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/${locale}/disputes/${dispute.id}`}
                          className="rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-xs font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          className="rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-xs font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-40"
                          disabled={actingId === dispute.id}
                          onClick={() => void onAction(dispute.id, 'dismiss')}
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          className="rounded border-2 border-neutral-900 bg-neutral-900 px-2.5 py-1 text-xs font-black text-white shadow-brutal-xs hover:bg-neutral-800 disabled:opacity-40"
                          disabled={actingId === dispute.id}
                          onClick={() => void onAction(dispute.id, 'resolve')}
                        >
                          Resolve
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
