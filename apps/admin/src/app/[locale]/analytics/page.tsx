'use client';

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
import { useEffect, useState } from 'react';

import { getAdminAnalytics, type AdminAnalytics } from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';

const AUTH_ERROR_MSG =
  'Session not ready. Please refresh the page or sign out and sign in again.';

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
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

export default function AdminAnalyticsPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!isLoaded || !isSignedIn) return;
      setLoading(true);
      setError(null);
      try {
        const token = await fetchToken();
        if (!token) throw new Error(AUTH_ERROR_MSG);
        const data = await getAdminAnalytics(token);
        setAnalytics(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [fetchToken, isLoaded, isSignedIn]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">User growth, booking volumes, revenue, and trust distribution.</p>
        </header>
        <div className="rounded-xl border p-8 text-center text-muted-foreground">Loading analytics...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-bold">Analytics</h1>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded border border-red-400 bg-white px-3 py-1.5 font-medium hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      </main>
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
    Total: Number(entry.car) + Number(entry.driver),
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
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">User growth, booking volumes, revenue, and trust distribution.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Cancellation rate" value={percent(analytics.cancellationNoShowRates.cancellationRate)} />
        <MetricCard title="No-show rate" value={percent(analytics.cancellationNoShowRates.noShowRate)} />
        <MetricCard title="Tracked bookings" value={String(analytics.cancellationNoShowRates.totalBookings)} />
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-4 font-semibold">Subscription revenue by tier (RWF)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()} RWF`]} />
              <Legend />
              <Line type="monotone" dataKey="Basic" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Premium" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Enterprise" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Driver" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-4 font-semibold">Booking volume (cars vs drivers)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bookingVolumeData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Car" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Driver" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-4 font-semibold">User growth by role</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Renter" stackId="b" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Car owner" stackId="b" fill="#06b6d4" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Driver" stackId="b" fill="#f97316" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-4 font-semibold">Trust score distribution</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="h-64 w-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trustPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent: pct }: { name: string; percent: number }) => `${name} ${(pct * 100).toFixed(0)}%`}
                >
                  {trustPieData.map((entry) => (
                    <Cell key={entry.name} fill={TRUST_TIER_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Users']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(analytics.trustScoreDistribution).map(([tier, count]) => (
              <div key={tier} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: TRUST_TIER_COLORS[tier] ?? '#94a3b8' }}
                />
                <span className="text-sm capitalize">{tier}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-xl border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </article>
  );
}
