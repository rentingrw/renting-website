'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  adjustUserTrust,
  grantAdminRole,
  listAdminUsers,
  reinstateUser,
  revokeAdminRole,
  suspendUser,
  verifyUserPhone,
  type AdminUserListItem,
  type ListUsersFilters,
} from '@/lib/api';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import {
  adminBtnDanger,
  adminBtnGhost,
  adminBtnPrimary,
  adminError,
  adminInput,
  adminPage,
  adminSelect,
  adminTableHead,
} from '@/components/admin/admin-ui';
import { useAuthToken } from '@/lib/use-auth-token';
import { TableRowSkeleton } from '@/components/ui/skeleton';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';

const ROLES = ['renter', 'car_owner', 'driver'] as const;
const STATUSES = ['active', 'suspended', 'pending_verification', 'deactivated', 'banned'] as const;
const TRUST_TIERS = ['platinum', 'gold', 'silver', 'bronze', 'standard', 'warning', 'suspended'] as const;
const PAGE_SIZE = 20;
const SUSPENDED_ACCOUNT_STATUSES = new Set(['suspended', 'deactivated', 'banned']);

type UserActionKey = 'suspend' | 'reinstate' | 'verify' | 'trust' | 'grant-admin' | 'revoke-admin';

const TRUST_COLORS: Record<string, string> = {
  platinum: 'bg-emerald-100 text-emerald-900 border-emerald-400',
  gold: 'bg-amber-100 text-amber-900 border-amber-400',
  silver: 'bg-muted text-ink/80 border-border',
  bronze: 'bg-orange-100 text-orange-900 border-orange-400',
  standard: 'bg-blue-100 text-blue-900 border-blue-400',
  warning: 'bg-red-100 text-red-700 border-red-300',
  suspended: 'bg-red-900 text-white border-red-950',
};

function userModerationActions(
  user: AdminUserListItem,
): Array<{ key: UserActionKey; label: string; tone: 'default' | 'danger' }> {
  const actions: Array<{ key: UserActionKey; label: string; tone: 'default' | 'danger' }> = [
    { key: 'trust', label: 'Adjust trust', tone: 'default' },
  ];

  if (!user.isVerified) {
    actions.push({ key: 'verify', label: 'Verify phone', tone: 'default' });
  }

  if (user.status === 'active' || user.status === 'pending_verification') {
    actions.push({ key: 'suspend', label: 'Suspend', tone: 'danger' });
  } else if (SUSPENDED_ACCOUNT_STATUSES.has(user.status)) {
    actions.push({ key: 'reinstate', label: 'Reinstate', tone: 'default' });
  }

  if (user.hasClerkAccount !== false) {
    if (user.isPlatformAdmin === true) {
      actions.push({ key: 'revoke-admin', label: 'Revoke admin', tone: 'danger' });
    } else {
      actions.push({ key: 'grant-admin', label: 'Grant admin', tone: 'default' });
    }
  }

  return actions;
}

export default function AdminUsersPage() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
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

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const onUserAction = async (action: UserActionKey, userId: string) => {
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
    <main className={adminPage}>
      <AdminPageHeader
        title="Users"
        description="Renters, car hosts, drivers, and taxi accounts — status, phone verification, and trust score"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={filters.search ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              placeholder="Search name / email / phone"
              className={`h-9 min-w-[12rem] ${adminInput}`}
            />
            <select
              className={adminSelect}
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
              className={adminSelect}
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
              className={adminSelect}
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
            <button type="button" className={`h-9 ${adminBtnPrimary}`} onClick={() => void loadUsers()}>
              Search
            </button>
          </div>
        }
      />

      {error ? <div className={adminError}>{error}</div> : null}

      <section className="admin-panel">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className={adminTableHead}>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Roles</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Trust</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Activity</th>
                <th className="min-w-[17rem] px-4 py-3 text-xs font-black uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              ) : data.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center font-semibold text-muted-foreground" colSpan={6}>
                    No users found.
                  </td>
                </tr>
              ) : (
                data.items.map((user) => {
                  const moderation = userModerationActions(user);
                  return (
                    <tr key={user.id} className="border-t border-border hover:bg-brand-soft transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-ink">{user.fullName}</div>
                        <div className="text-xs font-medium text-muted-foreground">{user.email}</div>
                        {user.phone ? (
                          <div className="text-xs font-medium text-muted-foreground">{user.phone}</div>
                        ) : null}
                        {user.isPlatformAdmin === true ? (
                          <span className="mt-1 inline-block rounded-full border border-sun/40 bg-[#fbf4e0] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#8a6a10]">
                            Platform admin
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">{user.roles.join(', ')}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded border px-2 py-0.5 text-xs font-black capitalize ${TRUST_COLORS[user.trustTier] ?? 'bg-muted border-border text-ink/80'}`}
                        >
                          {user.trustTier}
                        </span>
                        <span className="ml-1.5 text-xs font-bold text-muted-foreground">({user.trustScore})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold capitalize text-ink/80">{user.status.replace(/_/g, ' ')}</span>
                        {!user.isVerified ? (
                          <span className="ml-2 text-xs font-bold text-amber-700">unverified</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        <div>{user.bookingCount} booking{user.bookingCount === 1 ? '' : 's'}</div>
                        <div>{user.listingCount} car listing{user.listingCount === 1 ? '' : 's'}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex min-w-[16rem] flex-col items-end gap-2">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Link
                              href={`/${locale}/bookings?userId=${encodeURIComponent(user.id)}`}
                              className={adminBtnGhost}
                            >
                              Bookings
                            </Link>
                            {user.roles.includes('driver') ? (
                              <Link
                                href={`/${locale}/drivers?search=${encodeURIComponent(user.email)}`}
                                className={adminBtnGhost}
                              >
                                Driver profile
                              </Link>
                            ) : null}
                            {(user.listingCount > 0 || user.roles.includes('car_owner')) ? (
                              <Link href={`/${locale}/listings`} className={adminBtnGhost}>
                                Cars
                              </Link>
                            ) : null}
                          </div>
                          {moderation.length > 0 ? (
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {moderation.map(({ key, label, tone }) => (
                                <button
                                  key={key}
                                  type="button"
                                  className={tone === 'danger' ? adminBtnDanger : adminBtnGhost}
                                  disabled={actingId === user.id}
                                  onClick={() => void onUserAction(key, user.id)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-3">
            <p className="text-sm font-semibold text-muted-foreground">
              Page {data.page} of {totalPages} · {data.total} total
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`${adminBtnGhost} disabled:opacity-40`}
                disabled={data.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page ?? 1) - 1 }))}
              >
                ← Previous
              </button>
              <button
                type="button"
                className={`${adminBtnGhost} disabled:opacity-40`}
                disabled={data.page >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page ?? 1) + 1) }))}
              >
                Next →
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
