'use client';

import type { ReactNode } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { onboardLabelClass } from '@/components/web/onboard-wizard-shell';
import type { SupportedLocale } from '@/i18n/routing';

type ApprovalStatus = 'pending_approval' | 'approved' | 'rejected';

type DriverApplicationSummaryProps = {
  locale: SupportedLocale;
  status: ApprovalStatus;
  rejectionReason?: string;
  fullName: string;
  photoUrl: string;
  phone: string;
  address: string;
  licenseCategories: string[];
  yearsExperience: number;
  transmission: string;
  availability: string;
  languages: string[];
  languageLabels: Record<string, string>;
  dailyRateRwf: string;
  monthlyRateRwf: string;
  idDocumentUrl: string;
  licenseDocumentUrl: string;
  formatRwf: (value: number) => string;
  onEdit?: () => void;
};

const STATUS_UI: Record<
  ApprovalStatus,
  {
    badge: string;
    panel: string;
    title: string;
    subtitle: string;
    accent: string;
  }
> = {
  pending_approval: {
    badge: 'border border-amber-300/80 bg-amber-100 text-amber-950',
    panel: 'border-amber-200/90 bg-gradient-to-br from-amber-50 via-card to-card shadow-card',
    accent: 'text-amber-900',
    title: 'Application under review',
    subtitle: 'An admin will approve or reject your application. Submission does not approve you automatically.',
  },
  approved: {
    badge: 'border border-brand/40 bg-brand text-white',
    panel: 'border-brand/25 bg-gradient-to-br from-brand-soft via-card to-card shadow-card',
    accent: 'text-brand',
    title: 'You are approved',
    subtitle: 'Customers can find you in search. Contact details stay hidden until a booking is confirmed.',
  },
  rejected: {
    badge: 'border border-red-300/80 bg-red-100 text-red-900',
    panel: 'border-red-200/90 bg-gradient-to-br from-red-50 via-card to-card shadow-card',
    accent: 'text-red-900',
    title: 'Application not approved',
    subtitle: 'Review the feedback below. You can update your details and submit again.',
  },
};

function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border/80 bg-white/60 p-4">
      <h2 className={`${onboardLabelClass} mb-3 text-brand`}>{title}</h2>
      {children}
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-2.5 last:border-0 sm:grid-cols-3 sm:gap-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground sm:col-span-2">{value}</dd>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-md border border-border bg-brand-soft/80 px-2 py-0.5 text-xs font-bold text-foreground">
          {item}
        </span>
      ))}
    </div>
  );
}

export function DriverApplicationSummary({
  locale,
  status,
  rejectionReason,
  fullName,
  photoUrl,
  phone,
  address,
  licenseCategories,
  yearsExperience,
  transmission,
  availability,
  languages,
  languageLabels,
  dailyRateRwf,
  monthlyRateRwf,
  idDocumentUrl,
  licenseDocumentUrl,
  formatRwf,
  onEdit,
}: DriverApplicationSummaryProps) {
  const ui = STATUS_UI[status];
  const languageNames = languages.map((code) => languageLabels[code] ?? code.toUpperCase());
  const rates = [
    dailyRateRwf && Number(dailyRateRwf) >= 1000 ? `${formatRwf(Number(dailyRateRwf))} RWF / day` : null,
    monthlyRateRwf && Number(monthlyRateRwf) >= 1000 ? `${formatRwf(Number(monthlyRateRwf))} RWF / month` : null,
  ].filter(Boolean);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppHeader locale={locale} />
      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className={`rounded-2xl border p-5 sm:p-6 ${ui.panel}`}>
          <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${ui.badge}`}>
            {status === 'pending_approval' ? 'Pending' : status === 'approved' ? 'Approved' : 'Rejected'}
          </span>
          <h1 className={`mt-4 text-2xl font-black ${ui.accent}`}>{ui.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{ui.subtitle}</p>
          {status === 'rejected' && rejectionReason ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-white/80 px-3 py-2 text-sm font-medium text-red-900">{rejectionReason}</p>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          <SummarySection title="Personal">
            <dl>
              <SummaryRow label="Full name" value={fullName || '—'} />
              <SummaryRow
                label="Profile photo"
                value={
                  photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="" className="h-20 w-20 rounded-full border-2 border-border object-cover" />
                  ) : (
                    '—'
                  )
                }
              />
            </dl>
          </SummarySection>

          <SummarySection title="Contact & location">
            <dl>
              <SummaryRow label="Phone" value={phone || '—'} />
              <SummaryRow label="Address" value={address || '—'} />
            </dl>
          </SummarySection>

          <SummarySection title="Driving & availability">
            <dl>
              <SummaryRow label="License categories" value={<ChipList items={licenseCategories} />} />
              <SummaryRow label="Experience" value={`${yearsExperience} year${yearsExperience === 1 ? '' : 's'}`} />
              <SummaryRow label="Transmission" value={transmission} />
              <SummaryRow label="Availability" value={availability} />
            </dl>
          </SummarySection>

          <SummarySection title="Languages">
            <ChipList items={languageNames} />
          </SummarySection>

          <SummarySection title="Rates">
            <dl>
              <SummaryRow label="Your charges" value={rates.length ? rates.join(' · ') : '—'} />
            </dl>
          </SummarySection>

          <SummarySection title="Documents">
            <div className="grid gap-4 sm:grid-cols-2">
              {idDocumentUrl ? (
                <div>
                  <p className={onboardLabelClass}>National ID</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={idDocumentUrl} alt="National ID" className="mt-1 max-h-44 w-full rounded-lg border border-border bg-white object-contain" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No ID photo on file.</p>
              )}
              {licenseDocumentUrl ? (
                <div>
                  <p className={onboardLabelClass}>Driving license</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={licenseDocumentUrl} alt="License" className="mt-1 max-h-44 w-full rounded-lg border border-border bg-white object-contain" />
                </div>
              ) : null}
            </div>
          </SummarySection>
        </div>

        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="mt-6 w-full rounded-full border border-brand bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-hover sm:w-auto"
          >
            Update application
          </button>
        ) : null}
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
