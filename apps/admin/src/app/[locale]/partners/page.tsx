'use client';

import { Building2, CheckCircle2, RefreshCw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import {
  adminBtnDanger,
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminPage,
  adminSelect,
} from '@/components/admin/admin-ui';
import {
  approveCompanyPartner,
  getAdminCompanyPartnerDetail,
  listAdminCompanyPartners,
  rejectCompanyPartner,
  type AdminCompanyPartnerDetail,
  type AdminCompanyPartnerItem,
  type CompanyPartnerStatus,
  type ListCompanyPartnersFilters,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';
import { TableRowSkeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: CompanyPartnerStatus | ''; label: string }[] = [
  { value: 'pending_approval', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
];

const STATUS_BADGE: Record<CompanyPartnerStatus, string> = {
  pending_approval: 'bg-sun text-ink border-amber-600',
  approved: 'bg-emerald-400 text-ink border-emerald-700',
  rejected: 'bg-red-200 text-red-900 border-red-700',
};

function formatStatus(status: CompanyPartnerStatus) {
  return status.replaceAll('_', ' ');
}

function formatSubmitted(at: string) {
  return new Date(at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type PartnerReviewModalProps = {
  applicationId: string;
  onClose: () => void;
  onUpdated: () => void;
};

function PartnerReviewModal({ applicationId, onClose, onUpdated }: PartnerReviewModalProps) {
  const { fetchToken } = useAuthToken();
  const [detail, setDetail] = useState<AdminCompanyPartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await fetchToken();
        if (!token) throw new Error('Not authenticated.');
        const d = await getAdminCompanyPartnerDetail(token, applicationId);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId, fetchToken]);

  const onApprove = async () => {
    setActing(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Not authenticated.');
      await approveCompanyPartner(token, applicationId);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed.');
    } finally {
      setActing(false);
    }
  };

  const onReject = async () => {
    if (!rejectReason.trim()) {
      setError('Enter a rejection reason so the applicant knows what to fix.');
      return;
    }
    setActing(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Not authenticated.');
      await rejectCompanyPartner(token, applicationId, rejectReason.trim());
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setActing(false);
    }
  };

  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-3 gap-2 border-b border-border py-2.5 text-sm last:border-b-0">
      <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="col-span-2 font-semibold text-ink">{value}</dd>
    </div>
  );

  const pending = detail?.status === 'pending_approval';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col admin-panel">
        <div className="flex items-center justify-between border-b border-border bg-brand px-6 py-4">
          <div className="flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5" aria-hidden />
            <h2 className="font-black">Company partner request</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {loading ? <p className="text-sm font-semibold text-muted-foreground">Loading application…</p> : null}
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}
          {detail ? (
            <>
              <p className="mb-4 text-lg font-black text-ink">{detail.companyName}</p>
              {detail.status ? (
                <span
                  className={`mb-4 inline-flex rounded border px-2.5 py-1 text-xs font-black capitalize ${STATUS_BADGE[detail.status]}`}
                >
                  {formatStatus(detail.status)}
                </span>
              ) : null}
              <dl>
                {row('Applicant', detail.user.fullName)}
                {row('Email', detail.user.email)}
                {row('Account phone', detail.user.phone ?? '—')}
                {row('Business phone', detail.contactPhone ?? '—')}
                {row('Office address', detail.workAddress ?? '—')}
                {row('TIN', detail.tinNumber ?? '—')}
                {row('Submitted', formatSubmitted(detail.submittedAt))}
                {detail.reviewedAt ? row('Reviewed', formatSubmitted(detail.reviewedAt)) : null}
                {detail.rejectionReason ? (
                  row('Rejection reason', <span className="text-red-700">{detail.rejectionReason}</span>)
                ) : null}
              </dl>
              {detail.message ? (
                <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Note from applicant</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-ink">{detail.message}</p>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {pending ? (
          <div className="space-y-3 border-t border-border bg-muted/50 p-4">
            <label className="block text-xs font-black uppercase tracking-wide text-muted-foreground">
              Rejection reason
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Required only if you reject — e.g. missing TIN or company not registered in Rwanda."
              className={`min-h-[80px] w-full resize-y ${adminInput}`}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" disabled={acting} onClick={onClose} className={adminBtnSecondary}>
                Cancel
              </button>
              <button
                type="button"
                disabled={acting || !rejectReason.trim()}
                onClick={() => void onReject()}
                className={adminBtnDanger}
              >
                Reject request
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => void onApprove()}
                className={adminBtnPrimary}
              >
                Approve partner
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end border-t border-border bg-muted/30 p-4">
            <button type="button" onClick={onClose} className={adminBtnSecondary}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPartnersPage() {
  const { fetchToken } = useAuthToken();
  const [filters, setFilters] = useState<ListCompanyPartnersFilters>({
    status: 'pending_approval',
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [items, setItems] = useState<AdminCompanyPartnerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');

  const loadList = useCallback(async () => {
    const token = await fetchToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminCompanyPartners(token, filters);
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load partner requests.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, filters]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusLabel = useMemo(() => {
    const opt = STATUS_OPTIONS.find((o) => o.value === (filters.status ?? ''));
    return opt?.label ?? 'All';
  }, [filters.status]);

  const onQuickApprove = async (row: AdminCompanyPartnerItem) => {
    if (row.status !== 'pending_approval') return;
    const ok = window.confirm(
      `Approve "${row.companyName}" as a company partner?\n\nThey can list fleet vehicles and receive booking emails.`,
    );
    if (!ok) return;
    setActingId(row.id);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error('Session not ready.');
      await approveCompanyPartner(token, row.id);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <main className={adminPage}>
      <AdminPageHeader
        title="Company partners"
        description="Rental companies apply from the user dashboard. Approve to enable fleet listings and booking notifications."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.status ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: (e.target.value as CompanyPartnerStatus) || undefined,
                  page: 1,
                }))
              }
              className={adminSelect}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search company, name, or email…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setFilters((f) => ({ ...f, search: searchDraft.trim() || undefined, page: 1 }));
                  }
                }}
                onBlur={() => setFilters((f) => ({ ...f, search: searchDraft.trim() || undefined, page: 1 }))}
                className={`h-9 min-w-[14rem] pl-9 ${adminInput}`}
              />
            </div>
            <button type="button" onClick={() => void loadList()} className={adminBtnGhost}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {reviewId ? (
        <PartnerReviewModal
          applicationId={reviewId}
          onClose={() => setReviewId(null)}
          onUpdated={() => void loadList()}
        />
      ) : null}

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-brutal-red">
          {error}
        </div>
      ) : null}

      <div className="admin-panel">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <p className="text-sm font-bold text-ink">
            {statusLabel}
            <span className="ml-2 font-semibold text-muted-foreground">({total})</span>
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            Pending requests need <strong className="text-ink">Review</strong>,{' '}
            <strong className="text-ink">Approve</strong>, or <strong className="text-ink">Reject</strong>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-brand text-white">
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Company</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Applicant</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Phone</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">TIN</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Submitted</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-hill" />
                    <p className="text-sm font-semibold text-muted-foreground">
                      {filters.status === 'pending_approval'
                        ? 'No partner requests waiting for review.'
                        : 'No partner requests match this filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-t border-border transition-colors hover:bg-brand-soft/60">
                    <td className="px-5 py-3">
                      <div className="font-bold text-ink">{row.companyName}</div>
                      {row.workAddress ? (
                        <p className="mt-0.5 max-w-[12rem] truncate text-xs font-medium text-muted-foreground">
                          {row.workAddress}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-ink">{row.user.fullName}</div>
                      <div className="text-xs font-medium text-muted-foreground">{row.user.email}</div>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-ink/80">
                      {row.contactPhone ?? row.user.phone ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-ink/80">{row.tinNumber ?? '—'}</td>
                    <td className="px-5 py-3 text-xs font-medium text-muted-foreground">
                      {formatSubmitted(row.submittedAt)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded border px-2 py-0.5 text-xs font-black capitalize ${STATUS_BADGE[row.status]}`}
                      >
                        {formatStatus(row.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewId(row.id)}
                          className="rounded-lg border border-border bg-sun px-3 py-1.5 text-xs font-black text-ink shadow-brutal-xs transition hover:brightness-105"
                        >
                          Review
                        </button>
                        {row.status === 'pending_approval' ? (
                          <>
                            <button
                              type="button"
                              disabled={actingId === row.id}
                              onClick={() => void onQuickApprove(row)}
                              className="rounded-lg border border-emerald-700 bg-emerald-400 px-3 py-1.5 text-xs font-black text-ink shadow-brutal-xs transition hover:brightness-105 disabled:opacity-40"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setReviewId(row.id)}
                              className={adminBtnDanger}
                            >
                              Reject…
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-bold shadow-brutal-xs transition disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-bold shadow-brutal-xs transition disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page ?? 1) + 1) }))}
              >
                Next →
              </button>
            </div>
          </div>
        ) : (
          <p className="border-t border-border px-5 py-2.5 text-xs font-medium text-muted-foreground">{total} total</p>
        )}
      </div>
    </main>
  );
}