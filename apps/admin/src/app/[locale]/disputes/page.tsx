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

const AUTH_ERROR_MSG =
  'Session not ready. Please refresh the page or sign out and sign in again.';

const STATUSES = ['open', 'under_review', 'waiting_evidence', 'escalated', 'resolved', 'rejected'] as const;
const PAGE_SIZE = 20;

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

  useEffect(() => {
    void loadDisputes();
  }, [loadDisputes]);

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

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Disputes</h1>
          <p className="text-sm text-muted-foreground">Review open disputes and take moderation actions.</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.openOnly ?? true}
              onChange={(e) => setFilters((f) => ({ ...f, openOnly: e.target.checked, page: 1 }))}
            />
            <span className="text-sm">Open only</span>
          </label>
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
          <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-muted" onClick={() => void loadDisputes()}>
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
                <th className="px-4 py-2 font-medium">Priority</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Parties</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={5}>
                    Loading disputes...
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={5}>
                    No disputes found.
                  </td>
                </tr>
              ) : (
                data.items.map((dispute) => (
                  <tr key={dispute.id} className="border-t">
                    <td className="px-4 py-3 capitalize">{dispute.priority}</td>
                    <td className="px-4 py-3">{dispute.reason}</td>
                    <td className="px-4 py-3">
                      {dispute.openedBy.fullName} vs {dispute.againstUser.fullName}
                    </td>
                    <td className="px-4 py-3">{dispute.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/${locale}/disputes/${dispute.id}`}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          disabled={actingId === dispute.id}
                          onClick={() => void onAction(dispute.id, 'dismiss')}
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
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
