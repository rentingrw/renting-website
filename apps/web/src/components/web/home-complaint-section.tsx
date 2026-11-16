'use client';

import { MessageSquareWarning, Phone, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { submitSiteComplaint } from '@/lib/api';

export function HomeComplaintSection() {
  const t = useTranslations('web.home.complaint');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit() {
    setError('');
    const name = fullName.trim();
    const phoneVal = phone.trim();
    const msg = message.trim();
    if (name.length < 2 || phoneVal.replace(/\D/g, '').length < 9 || msg.length < 10) {
      setError(t('validation'));
      return;
    }
    setBusy(true);
    try {
      await submitSiteComplaint({
        fullName: name,
        phone: phoneVal,
        email: email.trim() || undefined,
        message: msg,
      });
      setSent(true);
      setFullName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('submitFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div>
          <ComplaintIcon />
          <h2 className="mt-4 text-2xl font-black text-foreground sm:text-3xl">{t('title')}</h2>
          <p className="mt-3 max-w-md text-sm font-medium text-muted-foreground sm:text-base">{t('subtitle')}</p>
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Phone className="h-4 w-4 text-brand" aria-hidden />
            {t('callYou')}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          {sent ? (
            <p className="rounded-xl border border-border bg-brand-soft px-4 py-4 text-sm font-medium text-foreground">
              {t('success')}
            </p>
          ) : (
            <ComplaintForm busy={busy} error={error} onSubmit={() => void onSubmit()} submitLabel={t('submit')}>
              <Field label={t('name')} value={fullName} onChange={setFullName} placeholder={t('namePlaceholder')} />
              <Field label={t('phone')} value={phone} onChange={setPhone} type="tel" placeholder="078 000 0000" />
              <Field
                label={t('emailOptional')}
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="you@email.com"
              />
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t('message')}
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('messagePlaceholder')}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </ComplaintForm>
          )}
        </div>
      </div>
    </section>
  );
}

function ComplaintIcon() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-card">
      <MessageSquareWarning className="h-7 w-7 text-brand" />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}

function ComplaintForm({
  children,
  onSubmit,
  busy,
  error,
  submitLabel,
}: {
  children: ReactNode;
  onSubmit: () => void;
  busy: boolean;
  error: string;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      {children}
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-black text-white hover:bg-brand-hover disabled:opacity-60"
      >
        <Send className="h-4 w-4" aria-hidden />
        {busy ? '…' : submitLabel}
      </button>
    </div>
  );
}