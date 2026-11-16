'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createAdminJob,
  deleteAdminJob,
  listAdminJobApplications,
  listAdminJobs,
  updateAdminJob,
  type JobApplicationItem,
  type JobOpeningItem,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import {
  adminBadgeLive,
  adminBadgeMuted,
  adminBtnDanger,
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnSecondary,
  adminError,
  adminInput,
  adminPage,
  adminPanel,
  adminPanelBody,
  adminPanelHeader,
  adminSelect,
  adminTabActive,
  adminTabIdle,
  adminTabs,
  adminTableHead,
} from '@/components/admin/admin-ui';
import { TableRowSkeleton } from '@/components/ui/skeleton';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';

const EMPTY_FORM = {
  title: '',
  employmentType: 'Full-time',
  location: 'Kigali, Rwanda',
  description: '',
  externalApplyUrl: '',
  applicationDeadline: '',
  isActive: true,
};

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const APPLICATIONS_PAGE_SIZE = 20;

type CareersTab = 'openings' | 'applications';

function formatWhen(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminJobsPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [tab, setTab] = useState<CareersTab>('openings');
  const [items, setItems] = useState<JobOpeningItem[]>([]);
  const [applications, setApplications] = useState<JobApplicationItem[]>([]);
  const [applicationsTotal, setApplicationsTotal] = useState(0);
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [filterJobId, setFilterJobId] = useState('');
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadOpenings = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      if (isLoaded) setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      setItems(await listAdminJobs(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn]);

  const loadApplications = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      if (isLoaded) setApplicationsLoading(false);
      return;
    }
    setApplicationsLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const res = await listAdminJobApplications(token, {
        page: applicationsPage,
        pageSize: APPLICATIONS_PAGE_SIZE,
        jobOpeningId: filterJobId || undefined,
      });
      setApplications(res.items);
      setApplicationsTotal(res.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load applications.');
    } finally {
      setApplicationsLoading(false);
    }
  }, [applicationsPage, fetchToken, filterJobId, isLoaded, isSignedIn]);

  useEffect(() => {
    void loadOpenings();
  }, [loadOpenings]);

  useEffect(() => {
    if (tab === 'applications') void loadApplications();
  }, [tab, loadApplications]);

  function startEdit(item: JobOpeningItem) {
    setTab('openings');
    setEditingId(item.id);
    setForm({
      title: item.title,
      employmentType: item.employmentType,
      location: item.location,
      description: item.description,
      externalApplyUrl: item.externalApplyUrl ?? '',
      applicationDeadline: toDatetimeLocalValue(item.applicationDeadline),
      isActive: item.isActive,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const payload = {
        title: form.title.trim(),
        employmentType: form.employmentType.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        externalApplyUrl: form.externalApplyUrl.trim() || null,
        applicationDeadline: form.applicationDeadline.trim()
          ? new Date(form.applicationDeadline).toISOString()
          : null,
        isActive: form.isActive,
      };
      if (editingId) await updateAdminJob(token, editingId, payload);
      else await createAdminJob(token, payload);
      resetForm();
      await loadOpenings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save job.');
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(item: JobOpeningItem) {
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await updateAdminJob(token, item.id, { isActive: !item.isActive });
      await loadOpenings();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update job.');
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this job opening?')) return;
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await deleteAdminJob(token, id);
      if (editingId === id) resetForm();
      await loadOpenings();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete job.');
    }
  }

  const canSave =
    form.title.trim().length >= 2 &&
    form.employmentType.trim().length >= 2 &&
    form.location.trim().length >= 2 &&
    form.description.trim().length >= 10;

  const applicationPages = Math.ceil(applicationsTotal / APPLICATIONS_PAGE_SIZE) || 1;

  return (
    <div className={adminPage}>
      <AdminPageHeader
        title="Careers"
        description="Publish roles on renting.rw/careers. Each application is stored here and emailed to the admin alert address."
      />

      <div className={adminTabs}>
        {(
          [
            { id: 'openings' as const, label: 'Job openings' },
            { id: 'applications' as const, label: 'Applications' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${tab === id ? adminTabActive : adminTabIdle}`}
          >
            {label}
            {id === 'applications' && applicationsTotal > 0 ? (
              <span className="ml-1.5 rounded-full bg-sun px-1.5 py-0.5 text-[10px] font-black text-ink">
                {applicationsTotal}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? <div className={adminError}>{error}</div> : null}

      {tab === 'openings' ? (
        <>
          <div className={adminPanel}>
            <div className={adminPanelHeader}>
              <h2 className="font-black text-ink">{editingId ? 'Edit job' : 'Add a job'}</h2>
            </div>
            <div className={`${adminPanelBody} space-y-4`}>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">Title</label>
                <input
                  className={adminInput}
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Customer Support Agent"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">Type</label>
                  <input
                    className={adminInput}
                    value={form.employmentType}
                    onChange={(event) => setForm((prev) => ({ ...prev, employmentType: event.target.value }))}
                    placeholder="Full-time"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">Location</label>
                  <input
                    className={adminInput}
                    value={form.location}
                    onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="Kigali, Rwanda"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">Description</label>
                <textarea
                  rows={4}
                  className={`${adminInput} resize-y`}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="What the person will do, and what you are looking for."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                  External apply link (optional)
                </label>
                <input
                  type="url"
                  className={adminInput}
                  value={form.externalApplyUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, externalApplyUrl: event.target.value }))}
                  placeholder="https://forms.google.com/… or LinkedIn, etc."
                />
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  If set, careers page applicants use this link instead of the on-site form.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Application deadline (optional)
                </label>
                <input
                  type="datetime-local"
                  className={adminInput}
                  value={form.applicationDeadline}
                  onChange={(event) => setForm((prev) => ({ ...prev, applicationDeadline: event.target.value }))}
                />
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  After this time the role is hidden on the site and applications close. Leave empty for no deadline.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-ink/80">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                Visible on the website
              </label>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void onSave()} disabled={saving || !canSave} className={adminBtnPrimary}>
                  {saving ? 'Saving…' : editingId ? 'Update job' : 'Publish job'}
                </button>
                {editingId ? (
                  <button type="button" onClick={resetForm} className={adminBtnSecondary}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className={adminPanel}>
            <div className={adminPanelHeader}>
              <h2 className="font-black text-ink">Published roles</h2>
            </div>
            {loading ? (
              <p className="px-5 py-10 text-center text-sm font-semibold text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm font-semibold text-muted-foreground">No jobs yet. Add one above.</p>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={item.isActive ? adminBadgeLive : adminBadgeMuted}>
                          {item.isActive ? 'Live' : 'Hidden'}
                        </span>
                        <p className="font-black text-ink">{item.title}</p>
                      </div>
                      <p className="mt-1 text-xs font-bold text-muted-foreground">
                        {item.employmentType} · {item.location}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                        Posted {formatWhen(item.createdAt)}
                        {item.applicationDeadline
                          ? ` · Apply by ${formatWhen(item.applicationDeadline)}`
                          : ' · No deadline'}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-medium text-muted-foreground">{item.description}</p>
                      {item.externalApplyUrl ? (
                        <a
                          href={item.externalApplyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-bold text-brand hover:underline"
                        >
                          External apply link
                        </a>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button type="button" onClick={() => void onToggle(item)} className={adminBtnGhost}>
                        {item.isActive ? 'Hide' : 'Show'}
                      </button>
                      <button type="button" onClick={() => startEdit(item)} className={adminBtnGhost}>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterJobId(item.id);
                          setApplicationsPage(1);
                          setTab('applications');
                        }}
                        className={adminBtnGhost}
                      >
                        Applications
                      </button>
                      <button type="button" onClick={() => void onDelete(item.id)} className={adminBtnDanger}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <section className="admin-panel">
          <div className={`${adminPanelHeader} flex flex-wrap items-center justify-between gap-3`}>
            <h2 className="font-black text-ink">Applications</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={adminSelect}
                value={filterJobId}
                onChange={(e) => {
                  setFilterJobId(e.target.value);
                  setApplicationsPage(1);
                }}
              >
                <option value="">All roles</option>
                {items.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
              <button type="button" className={adminBtnGhost} onClick={() => void loadApplications()}>
                Refresh
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className={adminTableHead}>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">When</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Applicant</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">Message</th>
                </tr>
              </thead>
              <tbody>
                {applicationsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center font-semibold text-muted-foreground">
                      No applications yet.
                    </td>
                  </tr>
                ) : (
                  applications.map((row) => (
                    <tr key={row.id} className="border-t border-border align-top hover:bg-brand-soft/50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-muted-foreground">
                        {formatWhen(row.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink">{row.roleTitle}</p>
                        {row.jobTitle && row.jobTitle !== row.roleTitle ? (
                          <p className="text-xs text-muted-foreground">{row.jobTitle}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-bold text-ink">{row.fullName}</td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        <a href={`mailto:${row.email}`} className="block text-brand hover:underline">
                          {row.email}
                        </a>
                        <a href={`tel:${row.phone.replace(/\s/g, '')}`} className="mt-1 block text-muted-foreground hover:text-ink">
                          {row.phone}
                        </a>
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <p className="whitespace-pre-wrap text-sm font-medium text-muted-foreground">{row.message}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {applicationPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-3">
              <p className="text-sm font-semibold text-muted-foreground">
                Page {applicationsPage} of {applicationPages} · {applicationsTotal} total
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`${adminBtnGhost} disabled:opacity-40`}
                  disabled={applicationsPage <= 1}
                  onClick={() => setApplicationsPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className={`${adminBtnGhost} disabled:opacity-40`}
                  disabled={applicationsPage >= applicationPages}
                  onClick={() => setApplicationsPage((p) => Math.min(applicationPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}