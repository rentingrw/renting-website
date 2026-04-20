'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  dismissDispute,
  getAdminOverview,
  resolveDispute,
  type AdminOverview,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';

const AUTH_ERROR_MSG =
  'Session not ready. Please refresh the page or sign out and sign in again.';

function formatRwf(amount: number) {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminHomePage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const data = await getAdminOverview(token);
      setOverview(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load admin dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleResolve = async (disputeId: string) => {
    setActingId(disputeId);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await resolveDispute(token, disputeId, {
        bookingOutcome: 'cancelled_admin',
        resolutionNote: 'Resolved by admin from dashboard quick action.',
      });
      await loadOverview();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to resolve dispute.');
    } finally {
      setActingId(null);
    }
  };

  const handleDismiss = async (disputeId: string) => {
    setActingId(disputeId);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await dismissDispute(token, disputeId, 'Dismissed by admin from dashboard quick action.');
      await loadOverview();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to dismiss dispute.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Platform overview, priority disputes, and quick moderation actions.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-md border px-3 py-2 text-sm hover:bg-muted" href="./users">
            Users
          </Link>
          <Link className="rounded-md border px-3 py-2 text-sm hover:bg-muted" href="./disputes">
            Disputes
          </Link>
          <Link className="rounded-md border px-3 py-2 text-sm hover:bg-muted" href="./analytics">
            Analytics
          </Link>
        </div>
      </header>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="rounded border border-red-400 bg-white px-3 py-1.5 font-medium hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Total users"
          value={overview?.metrics.totalUsers ?? 0}
          loading={isLoading}
          subtitle={overview ? overview.metrics.usersByRole.map((item) => `${item.role}: ${item.count}`).join(' • ') : ''}
        />
        <MetricCard
          title="Active bookings today"
          value={overview?.metrics.activeBookingsToday ?? 0}
          loading={isLoading}
        />
        <MetricCard title="Open disputes" value={overview?.metrics.openDisputes ?? 0} loading={isLoading} />
        <MetricCard
          title="Monthly subscription revenue"
          value={formatRwf(overview?.metrics.monthlySubscriptionRevenueRwf ?? 0)}
          loading={isLoading}
        />
        <MetricCard
          title="Suspended trust tier users"
          value={overview?.trustScoreDistribution.suspended ?? 0}
          loading={isLoading}
        />
      </section>

      <section className="rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Open disputes</h2>
          <p className="text-sm text-muted-foreground">Quick actions for high-priority moderation work.</p>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 font-medium">Priority</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Parties</th>
                <th className="px-4 py-2 font-medium">Booking</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={6}>
                    Loading disputes...
                  </td>
                </tr>
              ) : (overview?.openDisputes.length ?? 0) === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={6}>
                    No open disputes.
                  </td>
                </tr>
              ) : (
                overview?.openDisputes.map((dispute) => (
                  <tr key={dispute.id} className="border-t">
                    <td className="px-4 py-3 capitalize">{dispute.priority}</td>
                    <td className="px-4 py-3">{dispute.reason}</td>
                    <td className="px-4 py-3">
                      {dispute.openedBy.fullName} vs {dispute.againstUser.fullName}
                    </td>
                    <td className="px-4 py-3">
                      {dispute.bookingType} / {dispute.bookingId?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">{dispute.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                          disabled={actingId === dispute.id}
                          onClick={() => void handleDismiss(dispute.id)}
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                          disabled={actingId === dispute.id}
                          onClick={() => void handleResolve(dispute.id)}
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
      </section>
    </main>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  loading: boolean;
}) {
  return (
    <article className="rounded-xl border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{loading ? '...' : value}</p>
      {subtitle ? <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p> : null}
    </article>
  );
}
