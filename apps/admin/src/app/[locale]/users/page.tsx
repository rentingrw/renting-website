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

const AUTH_ERROR_MSG =
  'Session not ready. Please refresh the page or sign out and sign in again.';

const ROLES = ['renter', 'car_owner', 'driver'] as const;
const STATUSES = ['active', 'suspended', 'pending_verification', 'deactivated', 'banned'] as const;
const TRUST_TIERS = ['platinum', 'gold', 'silver', 'bronze', 'standard', 'warning', 'suspended'] as const;
const PAGE_SIZE = 20;

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
      const payload: ListUsersFilters = {
        page: filters.page,
        pageSize: PAGE_SIZE,
      };
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

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const onUserAction = async (action: 'suspend' | 'reinstate' | 'verify' | 'verify-kyc' | 'trust' | 'grant-admin' | 'revoke-admin', userId: string) => {
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

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage account status, verification, and trust score adjustments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            placeholder="Search name/email/phone"
            className="h-9 rounded-md border px-3 text-sm"
          />
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={filters.role ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace('_', ' ')}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={filters.trustTier ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, trustTier: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All trust tiers</option>
            {TRUST_TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-muted" onClick={() => void loadUsers()}>
            Search
          </button>
        </div>
      </header>

      {error ? <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-xl border">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Roles</th>
                <th className="px-4 py-2 font-medium">Trust</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={5}>
                    Loading users...
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={5}>
                    No users found.
                  </td>
                </tr>
              ) : (
                data.items.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.fullName}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{user.roles.join(', ')}</td>
                    <td className="px-4 py-3">
                      {user.trustScore} <span className="text-xs text-muted-foreground">({user.trustTier})</span>
                    </td>
                    <td className="px-4 py-3">
                      {user.status}
                      {!user.isVerified ? <span className="ml-2 text-xs text-amber-700">phone unverified</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          disabled={actingId === user.id}
                          onClick={() => void onUserAction('trust', user.id)}
                        >
                          Trust
                        </button>
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          disabled={actingId === user.id}
                          onClick={() => void onUserAction('verify', user.id)}
                        >
                          Verify phone
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-teal-300 px-2 py-1 text-xs text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                          disabled={actingId === user.id}
                          onClick={() => void onUserAction('verify-kyc', user.id)}
                        >
                          Verify KYC
                        </button>
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          disabled={actingId === user.id}
                          onClick={() => void onUserAction('reinstate', user.id)}
                        >
                          Reinstate
                        </button>
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          disabled={actingId === user.id}
                          onClick={() => void onUserAction('suspend', user.id)}
                        >
                          Suspend
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-violet-300 px-2 py-1 text-xs text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                          disabled={actingId === user.id}
                          onClick={() => void onUserAction('grant-admin', user.id)}
                        >
                          Grant admin
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-orange-300 px-2 py-1 text-xs text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                          disabled={actingId === user.id}
                          onClick={() => void onUserAction('revoke-admin', user.id)}
                        >
                          Revoke admin
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
