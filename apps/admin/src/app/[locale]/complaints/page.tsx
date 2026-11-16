'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  dismissDispute,
  dismissSiteComplaint,
  listAdminDisputes,
  listAdminSiteComplaints,
  resolveDispute,
  resolveSiteComplaint,
  type AdminDisputeItem,
  type ListDisputesFilters,
  type ListSiteComplaintsFilters,
  type SiteComplaintItem,
} from '@/lib/api';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { adminBtnPrimary, adminPage, adminSelect, adminTabActive, adminTabIdle, adminTabs } from '@/components/admin/admin-ui';
import { useAuthToken } from '@/lib/use-auth-token';
import { TableRowSkeleton } from '@/components/ui/skeleton';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';
const BOOKING_STATUSES = ['open', 'under_review', 'waiting_evidence', 'escalated', 'resolved', 'rejected'] as const;
const SITE_STATUSES = ['open', 'resolved', 'dismissed'] as const;
const PAGE_SIZE = 20;

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-red-500 text-white border-red-700',
  medium: 'bg-sun text-ink border-amber-600',
  low: 'bg-blue-100 text-blue-900 border-blue-300',
};

type ComplaintsTab = 'site' | 'bookings';

function telHref(phone: string) {
  return `tel:${phone.replace(/\s/g, '')}`;
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminComplaintsPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const [tab, setTab] = useState<ComplaintsTab>('site');

  const [siteData, setSiteData] = useState<{ items: SiteComplaintItem[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [siteFilters, setSiteFilters] = useState<ListSiteComplaintsFilters>({
    openOnly: true,
    status: '',
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const [bookingData, setBookingData] = useState<{ items: AdminDisputeItem[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [bookingFilters, setBookingFilters] = useState<ListDisputesFilters>({
    openOnly: true,
    status: '',
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadSite = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const payload: ListSiteComplaintsFilters = { page: siteFilters.page, pageSize: PAGE_SIZE };
      payload.openOnly = siteFilters.openOnly ?? true;
      if (siteFilters.status) payload.status = siteFilters.status;
      const response = await listAdminSiteComplaints(token, payload);
      setSiteData({ items: response.items, total: response.total, page: response.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn, siteFilters.page, siteFilters.openOnly, siteFilters.status]);

  const loadBookings = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const payload: ListDisputesFilters = { page: bookingFilters.page, pageSize: PAGE_SIZE };
      payload.openOnly = bookingFilters.openOnly ?? true;
      if (bookingFilters.status) payload.status = bookingFilters.status;
      const response = await listAdminDisputes(token, payload);
      setBookingData({ items: response.items, total: response.total, page: response.page });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking complaints.');
    } finally {
      setLoading(false);
    }
  }, [bookingFilters.openOnly, bookingFilters.page, bookingFilters.status, fetchToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (tab === 'site') void loadSite();
    else void loadBookings();
  }, [tab, loadSite, loadBookings]);

  const siteTotalPages = Math.ceil(siteData.total / PAGE_SIZE) || 1;
  const bookingTotalPages = Math.ceil(bookingData.total / PAGE_SIZE) || 1;

  async function onSiteAction(id: string, action: 'resolve' | 'dismiss') {
    setActingId(id);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const note =
        action === 'resolve'
          ? window.prompt('Resolution note (optional):') ?? undefined
          : window.prompt('Dismissal note (optional):') ?? undefined;
      if (action === 'resolve') await resolveSiteComplaint(token, id, note);
      else await dismissSiteComplaint(token, id, note);
      await loadSite();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update complaint.');
    } finally {
      setActingId(null);
    }
  }

  async function onBookingAction(disputeId: string, action: 'resolve' | 'dismiss') {
    setActingId(disputeId);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      if (action === 'resolve') {
        await resolveDispute(token, disputeId, {
          bookingOutcome: 'cancelled_admin',
          resolutionNote: 'Resolved from complaints desk.',
        });
      } else {
        await dismissDispute(token, disputeId, 'Dismissed from complaints desk.');
      }
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update booking complaint.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <main className={adminPage}>
      <AdminPageHeader
        title="Complaints"
        description="Public complaints from the website and booking-related cases between users"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className={adminTabs}>
              <button
                type="button"
                className={tab === 'site' ? adminTabActive : adminTabIdle}
                onClick={() => setTab('site')}
              >
                From website
              </button>
              <button
                type="button"
                className={tab === 'bookings' ? adminTabActive : adminTabIdle}
                onClick={() => setTab('bookings')}
              >
                From bookings
              </button>
            </div>
          </div>
        }
      />

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>
      ) : null}

      {tab === 'site' ? (
        <>
          <header className="mb-3 flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={siteFilters.openOnly ?? true}
                onChange={(e) => setSiteFilters((f) => ({ ...f, openOnly: e.target.checked, page: 1 }))}
                className="h-4 w-4 rounded border border-border accent-amber-400"
              />
              <span className="text-sm font-bold">Open only</span>
            </label>
            <select
              className={adminSelect}
              value={siteFilters.status ?? ''}
              onChange={(e) => setSiteFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
            >
              <option value="">All statuses</option>
              {SITE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="button" className={`h-9 ${adminBtnPrimary}`} onClick={() => void loadSite()}>
              Refresh
            </button>
          </header>
          <ComplaintsSiteTable
            loading={loading}
            items={siteData.items}
            actingId={actingId}
            onAction={onSiteAction}
          />
          <Pager
            page={siteData.page}
            totalPages={siteTotalPages}
            total={siteData.total}
            onPrev={() => setSiteFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
            onNext={() => setSiteFilters((f) => ({ ...f, page: Math.min(siteTotalPages, (f.page ?? 1) + 1) }))}
          />
        </>
      ) : (
        <>
          <header className="mb-3 flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={bookingFilters.openOnly ?? true}
                onChange={(e) => setBookingFilters((f) => ({ ...f, openOnly: e.target.checked, page: 1 }))}
                className="h-4 w-4 rounded border border-border accent-amber-400"
              />
              <span className="text-sm font-bold">Open only</span>
            </label>
            <select
              className={adminSelect}
              value={bookingFilters.status ?? ''}
              onChange={(e) => setBookingFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
            >
              <option value="">All statuses</option>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <button type="button" className={`h-9 ${adminBtnPrimary}`} onClick={() => void loadBookings()}>
              Refresh
            </button>
          </header>
          <ComplaintsBookingTable
            loading={loading}
            items={bookingData.items}
            locale={locale}
            actingId={actingId}
            onAction={onBookingAction}
          />
          <Pager
            page={bookingData.page}
            totalPages={bookingTotalPages}
            total={bookingData.total}
            onPrev={() => setBookingFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
            onNext={() => setBookingFilters((f) => ({ ...f, page: Math.min(bookingTotalPages, (f.page ?? 1) + 1) }))}
          />
        </>
      )}
    </main>
  );
}

function ComplaintsSiteTable({
  items,
  loading,
  actingId,
  onAction,
}: {
  items: SiteComplaintItem[];
  loading: boolean;
  actingId: string | null;
  onAction: (id: string, action: 'resolve' | 'dismiss') => void;
}) {
  return (
    <section className="admin-panel">
      <div className="overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="bg-brand text-white">
              <th className="px-4 py-3 text-xs font-black uppercase">Submitted</th>
              <th className="px-4 py-3 text-xs font-black uppercase">Contact</th>
              <th className="px-4 py-3 text-xs font-black uppercase">Complaint</th>
              <th className="px-4 py-3 text-xs font-black uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-black uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center font-semibold text-muted-foreground">
                  No complaints yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-border align-top hover:bg-brand-soft">
                  <td className="px-4 py-3 text-xs font-medium text-muted-foreground">{formatWhen(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink">{item.fullName}</p>
                    <a href={telHref(item.phone)} className="text-xs font-bold text-sky-800">
                      {item.phone}
                    </a>
                    {item.email ? (
                      <a href={`mailto:${item.email}`} className="mt-0.5 block text-xs text-muted-foreground">
                        {item.email}
                      </a>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <p className="whitespace-pre-wrap text-sm font-medium text-ink/90">{item.message}</p>
                    {item.adminNotes ? (
                      <p className="mt-2 text-xs text-muted-foreground">Admin: {item.adminNotes}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-border px-2 py-0.5 text-xs font-bold capitalize">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'open' ? (
                      <div className="flex justify-end gap-2">
                        <a href={telHref(item.phone)} className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-bold">
                          Call
                        </a>
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-bold disabled:opacity-40"
                          onClick={() => onAction(item.id, 'dismiss')}
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          className="rounded border border-border bg-brand px-2.5 py-1 text-xs font-black text-white disabled:opacity-40"
                          onClick={() => onAction(item.id, 'resolve')}
                        >
                          Resolved
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ComplaintsBookingTable({
  items,
  loading,
  locale,
  actingId,
  onAction,
}: {
  items: AdminDisputeItem[];
  loading: boolean;
  locale: string;
  actingId: string | null;
  onAction: (id: string, action: 'resolve' | 'dismiss') => void;
}) {
  return (
    <section className="admin-panel">
      <div className="overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="bg-brand text-white">
              <th className="px-4 py-3 text-xs font-black uppercase">Priority</th>
              <th className="px-4 py-3 text-xs font-black uppercase">Reason</th>
              <th className="px-4 py-3 text-xs font-black uppercase">Parties</th>
              <th className="px-4 py-3 text-xs font-black uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-black uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center font-semibold text-muted-foreground">
                  No booking complaints found.
                </td>
              </tr>
            ) : (
              items.map((dispute) => (
                <tr key={dispute.id} className="border-t border-border hover:bg-brand-soft">
                  <td className="px-4 py-3">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-black capitalize ${PRIORITY_STYLE[dispute.priority] ?? 'bg-muted border-border'}`}
                    >
                      {dispute.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{dispute.reason}</td>
                  <td className="px-4 py-3 text-muted-foreground font-medium">
                    {dispute.openedBy.fullName} <span className="font-black text-xs">vs</span> {dispute.againstUser.fullName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-border px-2 py-0.5 text-xs font-bold capitalize">
                      {dispute.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/${locale}/disputes/${dispute.id}`}
                        className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-bold"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        disabled={actingId === dispute.id}
                        className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-bold disabled:opacity-40"
                        onClick={() => onAction(dispute.id, 'dismiss')}
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        disabled={actingId === dispute.id}
                        className="rounded border border-border bg-brand px-2.5 py-1 text-xs font-black text-white disabled:opacity-40"
                        onClick={() => onAction(dispute.id, 'resolve')}
                      >
                        Resolved
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
  );
}

function Pager({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
      <p className="text-sm font-semibold text-muted-foreground">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded border border-border px-3 py-1.5 text-sm font-bold disabled:opacity-40"
          disabled={page <= 1}
          onClick={onPrev}
        >
          ← Previous
        </button>
        <button
          type="button"
          className="rounded border border-border px-3 py-1.5 text-sm font-bold disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={onNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}