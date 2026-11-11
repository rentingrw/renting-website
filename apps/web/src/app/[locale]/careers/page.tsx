'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { applyForJob, listPublicJobs, type PublicJobOpening } from '@/lib/api';
import { SITE_EMAIL } from '@/lib/site-contact';
import { Briefcase, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

type ApplyTarget = { id: string | null; title: string };

const EMPTY_APPLICATION = { fullName: '', email: '', phone: '', message: '' };

export default function CareersPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [jobs, setJobs] = useState<PublicJobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [target, setTarget] = useState<ApplyTarget | null>(null);
  const [form, setForm] = useState(EMPTY_APPLICATION);
  const [sending, setSending] = useState(false);
  const [sentTitle, setSentTitle] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await listPublicJobs();
        if (!cancelled) setJobs(data);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Could not load jobs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function openApplication(next: ApplyTarget) {
    setTarget(next);
    setForm(EMPTY_APPLICATION);
    setFormError('');
    setSentTitle('');
  }

  async function submitApplication() {
    if (!target) return;
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const message = form.message.trim();
    if (fullName.length < 2 || !email.includes('@') || phone.length < 7 || message.length < 10) {
      setFormError('Enter your name, email, phone, and a short note (at least 10 characters).');
      return;
    }

    setSending(true);
    setFormError('');
    try {
      await applyForJob({
        ...(target.id ? { jobId: target.id } : {}),
        fullName,
        email,
        phone,
        message,
      });
      setSentTitle(target.title);
      setTarget(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not send application. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />

      <section className="bg-background px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-brand shadow-card">
              <Briefcase className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-foreground md:text-4xl">Careers at Renting.rw</h1>
          <p className="mt-4 text-base font-medium text-muted-foreground">
            Join the team building car, driver, and airport rental across Rwanda. Applications are sent to {SITE_EMAIL}.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="text-xl font-black text-foreground">Open positions</h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {loading ? 'Loading…' : `${jobs.length} position${jobs.length === 1 ? '' : 's'} available`}
        </p>
        {loadError ? <p className="mt-3 text-sm font-medium text-red-700">{loadError}</p> : null}
        {sentTitle ? (
          <p className="mt-4 rounded-xl border border-border bg-brand-soft px-4 py-3 text-sm font-medium text-foreground">
            Your application for {sentTitle} was sent to {SITE_EMAIL}.
          </p>
        ) : null}

        <div className="mt-6 space-y-4">
          {!loading && jobs.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-sm font-medium text-muted-foreground">
              There are no open roles right now. You can still send an open application below.
            </p>
          ) : null}
          {jobs.map((job) => (
            <article key={job.id} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-foreground">{job.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 font-bold text-brand">{job.employmentType}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 font-bold text-muted-foreground">{job.location}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm font-medium text-muted-foreground">{job.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openApplication({ id: job.id, title: job.title })}
                  className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  Apply
                </button>
              </div>
              {target?.id === job.id ? (
                <ApplicationForm
                  form={form}
                  sending={sending}
                  error={formError}
                  onChange={setForm}
                  onCancel={() => setTarget(null)}
                  onSubmit={() => void submitApplication()}
                />
              ) : null}
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-black text-foreground">Don&apos;t see your role?</h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Send your name, phone, and a short note. We read every application at {SITE_EMAIL}.
          </p>
          <button
            type="button"
            onClick={() => openApplication({ id: null, title: 'Open application' })}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <Mail className="h-4 w-4" />
            Send an open application
          </button>
          {target?.id === null ? (
            <ApplicationForm
              form={form}
              sending={sending}
              error={formError}
              onChange={setForm}
              onCancel={() => setTarget(null)}
              onSubmit={() => void submitApplication()}
            />
          ) : null}
        </div>
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}

function ApplicationForm({
  form,
  sending,
  error,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: typeof EMPTY_APPLICATION;
  sending: boolean;
  error: string;
  onChange: (value: typeof EMPTY_APPLICATION) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const fieldClass =
    'w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none';

  return (
    <form
      className="mt-5 space-y-3 border-t border-border pt-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={fieldClass}
          value={form.fullName}
          onChange={(event) => onChange({ ...form, fullName: event.target.value })}
          placeholder="Full name"
          autoComplete="name"
        />
        <input
          className={fieldClass}
          type="email"
          value={form.email}
          onChange={(event) => onChange({ ...form, email: event.target.value })}
          placeholder="Email"
          autoComplete="email"
        />
      </div>
      <input
        className={fieldClass}
        value={form.phone}
        onChange={(event) => onChange({ ...form, phone: event.target.value })}
        placeholder="Phone"
        autoComplete="tel"
      />
      <textarea
        className={`${fieldClass} min-h-[96px] resize-y`}
        value={form.message}
        onChange={(event) => onChange({ ...form, message: event.target.value })}
        placeholder="Tell us about yourself and why you want to join."
      />
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send to our email'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}
