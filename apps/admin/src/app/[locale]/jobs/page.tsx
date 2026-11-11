'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createAdminJob,
  deleteAdminJob,
  listAdminJobs,
  updateAdminJob,
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
} from '@/components/admin/admin-ui';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';

const EMPTY_FORM = {
  title: '',
  employmentType: 'Full-time',
  location: 'Kigali, Rwanda',
  description: '',
  isActive: true,
};

export default function AdminJobsPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [items, setItems] = useState<JobOpeningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
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

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(item: JobOpeningItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      employmentType: item.employmentType,
      location: item.location,
      description: item.description,
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
        isActive: form.isActive,
      };
      if (editingId) await updateAdminJob(token, editingId, payload);
      else await createAdminJob(token, payload);
      resetForm();
      await load();
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
      await load();
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
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete job.');
    }
  }

  const canSave =
    form.title.trim().length >= 2 &&
    form.employmentType.trim().length >= 2 &&
    form.location.trim().length >= 2 &&
    form.description.trim().length >= 10;

  return (
    <div className={adminPage}>
      <AdminPageHeader
        title="Careers"
        description="Roles published here show on renting.rw/careers. Applications are emailed to renting.rw@gmail.com — they are not stored in the admin."
      />

      {error ? <div className={adminError}>{error}</div> : null}

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
          <h2 className="font-black text-ink">Job openings</h2>
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
                  <p className="mt-2 line-clamp-2 text-sm font-medium text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" onClick={() => void onToggle(item)} className={adminBtnGhost}>
                    {item.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" onClick={() => startEdit(item)} className={adminBtnGhost}>
                    Edit
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
    </div>
  );
}
