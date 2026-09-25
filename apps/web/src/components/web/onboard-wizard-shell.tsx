'use client';

import { SignInButton, useAuth } from '@clerk/nextjs';
import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import type { SupportedLocale } from '@/i18n/routing';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

type OnboardWizardShellProps = {
  locale: SupportedLocale;
  title: string;
  subtitle: string;
  steps: string[];
  step: number;
  children: ReactNode;
  error?: string;
  busy?: boolean;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideNext?: boolean;
  onBack?: () => void;
  onNext?: () => void;
};

export function OnboardWizardShell({
  locale,
  title,
  subtitle,
  steps,
  step,
  children,
  error,
  busy,
  nextLabel = 'Continue',
  nextDisabled,
  hideNext,
  onBack,
  onNext,
}: OnboardWizardShellProps) {
  const { isSignedIn } = useAuth();
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppHeader locale={locale} />
      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <p className="text-xs font-black uppercase tracking-widest text-brand">
          Step {step + 1} of {steps.length} · {steps[step]}
        </p>
        <h1 className="mt-2 text-2xl font-black text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">{children}</div>
        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {!isSignedIn ? (
          <div className="mt-5 rounded-2xl border border-border bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Sign in to save your profile and pay. You stay hidden until payment or a promo succeeds.</p>
            <SignInButton mode="modal">
              <button type="button" className="mt-3 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
                Sign in to continue
              </button>
            </SignInButton>
          </div>
        ) : (
        <div className="mt-5 flex items-center justify-between gap-3">
          {onBack && step > 0 ? (
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <span />
          )}
          {hideNext ? null : (
            <button
              type="button"
              onClick={onNext}
              disabled={busy || nextDisabled}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {busy ? 'Please wait…' : nextLabel}
            </button>
          )}
        </div>
        )}
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}

export const onboardInputClass =
  'w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none';
export const onboardLabelClass = 'mb-1.5 block text-xs font-black uppercase tracking-widest text-muted-foreground';
