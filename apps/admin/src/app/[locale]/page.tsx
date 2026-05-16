'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  LayoutDashboard,
  RefreshCw,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import {
  dismissDispute,
  getAdminAnalytics,
  getAdminOverview,
  resolveDispute,
  type AdminAnalytics,
  type AdminOverview,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';
import { Skeleton, TableRowSkeleton } from '@/components/ui/skeleton';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';

function formatRwf(amount: number) {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(amount);
}

const TRUST_TIER_COLORS: Record<string, string> = {
  platinum: '#10b981',
  gold: '#f59e0b',
  silver: '#6b7280',
  bronze: '#d97706',
  standard: '#3b82f6',
  warning: '#ef4444',
  suspended: '#7f1d1d',
};

type Tab = 'overview' | 'analytics';

export default function AdminHomePage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const [ov, an] = await Promise.all([getAdminOverview(token), getAdminAnalytics(token)]);
      setOverview(ov);
      setAnalytics(an);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn]);

  useEffect(() => { void loadData(); }, [loadData]);

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
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve dispute.');
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
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss dispute.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <main className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-0.5 font-medium">Platform overview and analytics</p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="flex items-center gap-2 rounded border-2 border-neutral-900 bg-white px-3 py-2 text-sm font-bold shadow-brutal-sm hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded border-2 border-red-700 bg-red-50 p-3 text-sm font-semibold text-red-700 shadow-[3px_3px_0_#991b1b]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => void loadData()} className="font-black underline">Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-2 border-neutral-900 bg-white p-1 w-fit rounded shadow-brutal-sm">
        {(['overview', 'analytics'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 rounded px-4 py-1.5 text-sm font-bold transition-colors ${
              tab === t
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            {t === 'overview' ? <LayoutDashboard className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Metric cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <MetricCard
              title="Total users"
              value={overview?.metrics.totalUsers ?? 0}
              loading={isLoading}
              sub={overview?.metrics.usersByRole.map((r) => `${r.role}: ${r.count}`).join(' · ')}
            />
            <MetricCard title="Active bookings today" value={overview?.metrics.activeBookingsToday ?? 0} loading={isLoading} />
            <MetricCard
              title="Open disputes"
              value={overview?.metrics.openDisputes ?? 0}
              loading={isLoading}
              highlight={overview?.metrics.openDisputes ? 'warn' : undefined}
            />
            <MetricCard
              title="Monthly revenue"
              value={formatRwf(overview?.metrics.monthlySubscriptionRevenueRwf ?? 0)}
              loading={isLoading}
            />
            <MetricCard
              title="Suspended users"
              value={overview?.trustScoreDistribution.suspended ?? 0}
              loading={isLoading}
              highlight={overview?.trustScoreDistribution.suspended ? 'danger' : undefined}
            />
          </div>

          {/* Open disputes table */}
          <div className="rounded-md border-2 border-neutral-900 bg-white shadow-brutal overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-neutral-900 px-5 py-3.5 bg-white">
              <div>
                <h2 className="font-black text-neutral-900">Open Disputes</h2>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">Requiring moderation action</p>
              </div>
              {(overview?.openDisputes.length ?? 0) > 0 && (
                <span className="rounded border-2 border-neutral-900 bg-red-500 px-2 py-0.5 text-xs font-black text-white shadow-brutal-xs">
                  {overview?.openDisputes.length}
                </span>
              )}
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="bg-neutral-900 text-white">
                    <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Priority</th>
                    <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Reason</th>
                    <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Parties</th>
                    <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Booking</th>
                    <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                  ) : (overview?.openDisputes.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center">
                        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
                        <p className="text-sm font-semibold text-neutral-500">No open disputes — all clear!</p>
                      </td>
                    </tr>
                  ) : (
                    overview?.openDisputes.map((dispute) => (
                      <tr key={dispute.id} className="border-t-2 border-neutral-900 hover:bg-amber-50 transition-colors">
                        <td className="px-5 py-3">
                          <PriorityBadge priority={dispute.priority} />
                        </td>
                        <td className="px-5 py-3 font-semibold">{dispute.reason}</td>
                        <td className="px-5 py-3 text-neutral-600">
                          {dispute.openedBy.fullName} <span className="text-xs font-black">vs</span> {dispute.againstUser.fullName}
                        </td>
                        <td className="px-5 py-3 text-xs text-neutral-500 capitalize">
                          {dispute.bookingType} · <span className="font-mono">{dispute.bookingId?.slice(0, 8)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded border-2 border-neutral-900 px-2 py-0.5 text-xs font-bold capitalize">{dispute.status.replace('_', ' ')}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={actingId === dispute.id}
                              onClick={() => void handleDismiss(dispute.id)}
                              className="flex items-center gap-1 rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-xs font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40"
                            >
                              <XCircle className="h-3 w-3" />
                              Dismiss
                            </button>
                            <button
                              type="button"
                              disabled={actingId === dispute.id}
                              onClick={() => void handleResolve(dispute.id)}
                              className="flex items-center gap-1 rounded border-2 border-neutral-900 bg-neutral-900 px-2.5 py-1 text-xs font-black text-white shadow-brutal-xs hover:bg-neutral-800 disabled:opacity-40"
                            >
                              <CheckCircle2 className="h-3 w-3" />
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
          </div>
        </>
      )}

      {tab === 'analytics' && (
        <AnalyticsTab analytics={analytics} loading={isLoading} />
      )}
    </main>
  );
}

function PriorityBadge({ priority }: { priority: 'low' | 'medium' | 'high' }) {
  const map = {
    high: 'bg-red-500 text-white border-red-700',
    medium: 'bg-amber-400 text-neutral-900 border-amber-600',
    low: 'bg-blue-100 text-blue-900 border-blue-300',
  };
  return (
    <span className={`rounded border-2 px-2 py-0.5 text-xs font-black capitalize ${map[priority]}`}>
      {priority}
    </span>
  );
}

function MetricCard({
  title,
  value,
  sub,
  loading,
  highlight,
}: {
  title: string;
  value: string | number;
  sub?: string;
  loading: boolean;
  highlight?: 'warn' | 'danger';
}) {
  const borderColor =
    highlight === 'danger' ? 'border-red-600' : highlight === 'warn' ? 'border-amber-500' : 'border-neutral-900';
  const shadowColor =
    highlight === 'danger' ? 'shadow-brutal-red' : 'shadow-brutal';
  const valueColor =
    highlight === 'danger' ? 'text-red-600' : highlight === 'warn' ? 'text-amber-600' : 'text-neutral-900';

  return (
    <div className={`rounded-md border-2 ${borderColor} bg-white p-4 ${shadowColor}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{title}</p>
      <p className={`mt-2 text-2xl font-black ${valueColor}`}>
        {loading ? <Skeleton className="h-7 w-20" /> : value}
      </p>
      {sub && !loading && <p className="mt-1.5 text-xs font-medium text-neutral-500">{sub}</p>}
      {sub && loading && <Skeleton className="mt-1.5 h-3 w-32" />}
    </div>
  );
}

function AnalyticsTab({ analytics, loading }: { analytics: AdminAnalytics | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-md border-2 border-neutral-900 bg-white p-4 shadow-brutal">
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-md border-2 border-neutral-900 bg-white p-5 shadow-brutal">
              <Skeleton className="h-4 w-40 mb-4" />
              <Skeleton className="h-56 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!analytics) return null;

  const revenueData = analytics.subscriptionRevenueByTier.map((entry) => ({
    month: String(entry.month),
    Basic: Number(entry.standard ?? entry.basic ?? 0),
    Premium: Number(entry.premium ?? 0),
    Enterprise: Number(entry.business ?? entry.enterprise ?? 0),
    Driver: Number(entry.free ?? entry.driver ?? 0),
  }));

  const bookingVolumeData = analytics.bookingVolume.map((entry) => ({
    month: entry.month,
    Car: Number(entry.car),
    Driver: Number(entry.driver),
  }));

  const userGrowthData = analytics.userGrowth.map((entry) => ({
    month: entry.month,
    Renter: Number(entry.renter ?? 0),
    'Car owner': Number(entry.car_owner ?? 0),
    Driver: Number(entry.driver ?? 0),
  }));

  const trustPieData = Object.entries(analytics.trustScoreDistribution).map(([name, value]) => ({
    name,
    value: Number(value),
  }));

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Cancellation rate', value: `${(analytics.cancellationNoShowRates.cancellationRate * 100).toFixed(1)}%`, icon: TrendingUp },
          { label: 'No-show rate', value: `${(analytics.cancellationNoShowRates.noShowRate * 100).toFixed(1)}%`, icon: TrendingUp },
          { label: 'Tracked bookings', value: String(analytics.cancellationNoShowRates.totalBookings), icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 rounded-md border-2 border-neutral-900 bg-white p-4 shadow-brutal">
            <div className="flex h-9 w-9 items-center justify-center rounded border-2 border-neutral-900 bg-amber-400">
              <Icon className="h-4 w-4 text-neutral-900" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{label}</p>
              <p className="text-xl font-black text-neutral-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Subscription Revenue by Tier (RWF)">
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => [`${v.toLocaleString()} RWF`]} />
            <Legend />
            <Line type="monotone" dataKey="Basic" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Premium" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Enterprise" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Driver" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Booking Volume — Cars vs Drivers">
          <BarChart data={bookingVolumeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Car" stackId="a" fill="#10b981" />
            <Bar dataKey="Driver" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="User Growth by Role">
          <BarChart data={userGrowthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Renter" stackId="b" fill="#8b5cf6" />
            <Bar dataKey="Car owner" stackId="b" fill="#06b6d4" />
            <Bar dataKey="Driver" stackId="b" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Trust Score Distribution">
          <div className="flex flex-wrap items-center gap-4 h-full">
            <div className="flex-1 min-w-[160px] h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trustPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {trustPieData.map((entry) => (
                      <Cell key={entry.name} fill={TRUST_TIER_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Users']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2">
              {trustPieData.map(({ name, value }) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm border border-neutral-400" style={{ backgroundColor: TRUST_TIER_COLORS[name] ?? '#94a3b8' }} />
                  <span className="text-sm font-semibold capitalize">{name}</span>
                  <span className="ml-auto pl-4 font-black text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border-2 border-neutral-900 bg-white p-5 shadow-brutal">
      <h3 className="mb-4 font-black text-sm uppercase tracking-wide text-neutral-900">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
