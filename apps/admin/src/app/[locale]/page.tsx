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
  Megaphone,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import {
  dismissDispute,
  getAdminAnalytics,
  getAdminOverview,
  resolveDispute,
  listAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  type AdminAnalytics,
  type AdminOverview,
  type SiteBannerItem,
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

type Tab = 'overview' | 'analytics' | 'banners';

const EMPTY_BANNER_FORM = { message: '', ctaText: '', ctaUrl: '', isActive: true };

export default function AdminHomePage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  // Banner state
  const [banners, setBanners] = useState<SiteBannerItem[]>([]);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER_FORM);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerSaving, setBannerSaving] = useState(false);

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

  const loadBanners = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setBannerLoading(true);
    setBannerError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const data = await listAdminBanners(token);
      setBanners(data);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Failed to load banners.');
    } finally {
      setBannerLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn]);

  useEffect(() => { if (tab === 'banners') void loadBanners(); }, [tab, loadBanners]);

  async function handleSaveBanner() {
    setBannerSaving(true);
    setBannerError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const payload = {
        message: bannerForm.message.trim(),
        ctaText: bannerForm.ctaText.trim() || undefined,
        ctaUrl: bannerForm.ctaUrl.trim() || undefined,
        isActive: bannerForm.isActive,
      };
      if (editingBannerId) {
        await updateAdminBanner(token, editingBannerId, payload);
      } else {
        await createAdminBanner(token, payload);
      }
      setBannerForm(EMPTY_BANNER_FORM);
      setEditingBannerId(null);
      await loadBanners();
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Failed to save banner.');
    } finally {
      setBannerSaving(false);
    }
  }

  async function handleDeleteBanner(id: string) {
    if (!confirm('Delete this banner?')) return;
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await deleteAdminBanner(token, id);
      await loadBanners();
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Failed to delete banner.');
    }
  }

  async function handleToggleBannerActive(banner: SiteBannerItem) {
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await updateAdminBanner(token, banner.id, { isActive: !banner.isActive });
      await loadBanners();
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Failed to update banner.');
    }
  }

  function startEditBanner(banner: SiteBannerItem) {
    setEditingBannerId(banner.id);
    setBannerForm({
      message: banner.message,
      ctaText: banner.ctaText ?? '',
      ctaUrl: banner.ctaUrl ?? '',
      isActive: banner.isActive,
    });
  }

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
        {([
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'banners', label: 'Banners', icon: Megaphone },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded px-4 py-1.5 text-sm font-bold transition-colors ${
              tab === id
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
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

      {tab === 'banners' && (
        <div className="space-y-6">
          {bannerError && (
            <div className="flex items-center gap-3 rounded border-2 border-red-700 bg-red-50 p-3 text-sm font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {bannerError}
            </div>
          )}

          {/* Create / Edit form */}
          <div className="rounded-md border-2 border-neutral-900 bg-white shadow-brutal">
            <div className="border-b-2 border-neutral-900 px-5 py-3.5">
              <h2 className="font-black text-neutral-900">{editingBannerId ? 'Edit Banner' : 'Create Banner'}</h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">This banner appears at the top of the website for all visitors</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">Message *</label>
                <textarea
                  rows={2}
                  value={bannerForm.message}
                  onChange={(e) => setBannerForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="e.g. Start earning today — list your car on Renting.rw!"
                  className="w-full rounded border-2 border-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-900 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">CTA Text</label>
                  <input
                    type="text"
                    value={bannerForm.ctaText}
                    onChange={(e) => setBannerForm((f) => ({ ...f, ctaText: e.target.value }))}
                    placeholder="e.g. List your car"
                    className="w-full rounded border-2 border-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-900 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">CTA URL</label>
                  <input
                    type="text"
                    value={bannerForm.ctaUrl}
                    onChange={(e) => setBannerForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                    placeholder="e.g. /en/list-your-car"
                    className="w-full rounded border-2 border-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-900 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={bannerForm.isActive}
                    onChange={(e) => setBannerForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="h-5 w-9 rounded-full border-2 border-neutral-900 bg-neutral-200 peer-checked:bg-teal-500 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full border-2 border-neutral-900 bg-white transition-transform peer-checked:translate-x-4" />
                </label>
                <span className="text-sm font-bold text-neutral-700">Active (visible on site)</span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveBanner()}
                  disabled={bannerSaving || !bannerForm.message.trim()}
                  className="flex items-center gap-2 rounded border-2 border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-black text-white shadow-brutal-sm hover:bg-neutral-800 disabled:opacity-40 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  {bannerSaving ? 'Saving…' : editingBannerId ? 'Update Banner' : 'Create Banner'}
                </button>
                {editingBannerId && (
                  <button
                    type="button"
                    onClick={() => { setEditingBannerId(null); setBannerForm(EMPTY_BANNER_FORM); }}
                    className="rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-bold shadow-brutal-sm hover:bg-neutral-100 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Banners list */}
          <div className="rounded-md border-2 border-neutral-900 bg-white shadow-brutal overflow-hidden">
            <div className="border-b-2 border-neutral-900 px-5 py-3.5 flex items-center justify-between">
              <h2 className="font-black text-neutral-900">All Banners</h2>
              <button
                type="button"
                onClick={() => void loadBanners()}
                disabled={bannerLoading}
                className="flex items-center gap-1.5 rounded border-2 border-neutral-900 bg-white px-2.5 py-1.5 text-xs font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
              >
                <RefreshCw className={`h-3 w-3 ${bannerLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            {bannerLoading ? (
              <div className="px-5 py-10 text-center text-sm font-semibold text-neutral-500">Loading…</div>
            ) : banners.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Megaphone className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-500">No banners yet. Create one above.</p>
              </div>
            ) : (
              <div className="divide-y-2 divide-neutral-900">
                {banners.map((banner) => (
                  <div key={banner.id} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center rounded border-2 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          banner.isActive
                            ? 'border-teal-700 bg-teal-50 text-teal-700'
                            : 'border-neutral-400 bg-neutral-100 text-neutral-500'
                        }`}>
                          {banner.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <p className="font-bold text-neutral-900 truncate">{banner.message}</p>
                      </div>
                      {(banner.ctaText || banner.ctaUrl) && (
                        <p className="mt-1 text-xs text-neutral-500 font-medium">
                          CTA: {banner.ctaText && <span className="font-bold">{banner.ctaText}</span>}
                          {banner.ctaUrl && <span className="ml-1 text-teal-600">{banner.ctaUrl}</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleToggleBannerActive(banner)}
                        className="rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-xs font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
                      >
                        {banner.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditBanner(banner)}
                        className="rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-xs font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteBanner(banner.id)}
                        className="flex items-center gap-1 rounded border-2 border-red-400 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
