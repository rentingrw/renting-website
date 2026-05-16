'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  adjustUserTrust,
  grantAdminRole,
  listAdminUsers,
  reinstateUser,
  revokeAdminRole,
  suspendUser,
  verifyUserKyc,
  verifyUserPhone,
  type AdminUserListItem,
  type ListUsersFilters,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';
import { TableRowSkeleton } from '@/components/ui/skeleton';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';

const ROLES = ['renter', 'car_owner', 'driver'] as const;
const STATUSES = ['active', 'suspended', 'pending_verification', 'deactivated', 'banned'] as const;
const TRUST_TIERS = ['platinum', 'gold', 'silver', 'bronze', 'standard', 'warning', 'suspended'] as const;
const PAGE_SIZE = 20;

const TRUST_COLORS: Record<string, string> = {
  platinum: 'bg-emerald-100 text-emerald-900 border-emerald-400',
  gold: 'bg-amber-100 text-amber-900 border-amber-400',
  silver: 'bg-neutral-100 text-neutral-700 border-neutral-400',
  bronze: 'bg-orange-100 text-orange-900 border-orange-400',
  standard: 'bg-blue-100 text-blue-900 border-blue-400',
  warning: 'bg-red-100 text-red-700 border-red-300',
  suspended: 'bg-red-900 text-white border-red-950',
};

export default function AdminUsersPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [data, setData] = useState<{ items: AdminUserListItem[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [filters, setFilters] = useState<ListUsersFilters>({
    search: '',
    role: '',
    status: '',
    trustTier: '',
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const payload: ListUsersFilters = { page: filters.page, pageSize: PAGE_SIZE };
      if (filters.search?.trim()) payload.search = filters.search.trim();
      if (filters.role) payload.role = filters.role;
      if (filters.status) payload.status = filters.status;
      if (filters.trustTier) payload.trustTier = filters.trustTier;
      const response = await listAdminUsers(token, payload);
      setData({ items: response.items, total: response.total, page: response.page });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn, filters.page, filters.search, filters.role, filters.status, filters.trustTier]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const onUserAction = async (
    action: 'suspend' | 'reinstate' | 'verify' | 'verify-kyc' | 'trust' | 'grant-admin' | 'revoke-admin',
    userId: string,
  ) => {
    setActingId(userId);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);

      if (action === 'suspend') {
        await suspendUser(token, userId, window.prompt('Suspend reason (optional):') ?? undefined);
      } else if (action === 'reinstate') {
        await reinstateUser(token, userId, window.prompt('Reinstate reason (optional):') ?? undefined);
      } else if (action === 'verify') {
        await verifyUserPhone(token, userId);
      } else if (action === 'verify-kyc') {
        await verifyUserKyc(token, userId);
      } else if (action === 'grant-admin') {
        if (!window.confirm('Grant admin role to this user? They will have full admin access.')) return;
        await grantAdminRole(token, userId);
      } else if (action === 'revoke-admin') {
        if (!window.confirm('Revoke admin role from this user?')) return;
        await revokeAdminRole(token, userId);
      } else {
        const deltaValue = window.prompt('Trust score delta (integer):');
        const reason = window.prompt('Reason for trust adjustment:');
        if (!deltaValue || !reason?.trim()) throw new Error('Delta and reason are required.');
        const delta = Number(deltaValue);
        if (!Number.isInteger(delta)) throw new Error('Delta must be an integer.');
        await adjustUserTrust(token, userId, delta, reason.trim());
      }

      await loadUsers();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'User action failed.');
    } finally {
      setActingId(null);
    }
  };

  const totalPages = Math.ceil(data.total / PAGE_SIZE) || 1;

  const inputClass = 'h-9 rounded border-2 border-neutral-900 bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400';
  const btnGhost = 'rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-xs font-bold shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40';

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Users</h1>
          <p className="text-sm font-medium text-neutral-500">Manage account status, verification, and trust score adjustments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            placeholder="Search name / email / phone"
            className={inputClass}
          />
          <select
            className={inputClass}
            value={filters.role ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
          <select
            className={inputClass}
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select
            className={inputClass}
            value={filters.trustTier ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, trustTier: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All trust tiers</option>
            {TRUST_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            type="button"
            className="h-9 rounded border-2 border-neutral-900 bg-neutral-900 px-4 text-sm font-black text-white shadow-brutal-sm hover:bg-neutral-800 hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
            onClick={() => void loadUsers()}
          >
            Search
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
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Roles</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Trust</th>
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
                    No users found.
                  </td>
                </tr>
              ) : (
                data.items.map((user) => (
                  <tr key={user.id} className="border-t-2 border-neutral-900 hover:bg-amber-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-neutral-900">{user.fullName}</div>
                      <div className="text-xs font-medium text-neutral-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-neutral-600">{user.roles.join(', ')}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded border-2 px-2 py-0.5 text-xs font-black capitalize ${TRUST_COLORS[user.trustTier] ?? 'bg-neutral-100 border-neutral-400 text-neutral-700'}`}>
                        {user.trustTier}
                      </span>
                      <span className="ml-1.5 text-xs font-bold text-neutral-400">({user.trustScore})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold capitalize text-neutral-700">{user.status}</span>
                      {!user.isVerified ? <span className="ml-2 text-xs font-bold text-amber-700">unverified</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {[
                          { key: 'trust' as const, label: 'Trust ±' },
                          { key: 'verify' as const, label: 'Verify phone' },
                          { key: 'verify-kyc' as const, label: 'KYC' },
                          { key: 'reinstate' as const, label: 'Reinstate' },
                          { key: 'suspend' as const, label: 'Suspend' },
                          { key: 'grant-admin' as const, label: 'Grant admin' },
                          { key: 'revoke-admin' as const, label: 'Revoke admin' },
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            className={btnGhost}
                            disabled={actingId === user.id}
                            onClick={() => void onUserAction(key, user.id)}
                          >
                            {label}
                          </button>
                        ))}
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
