'use client';

import { useAuth } from '@clerk/nextjs';
import { Button } from '@rentingi/ui';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { DashboardHeader } from '@/components/web/dashboard-header';
import { AppLoadingSkeleton } from '@/components/web/loading-states';
import { PartnerBookingInstructions } from '@/components/web/partner-booking-instructions';
import { RegistrationAgreement, registrationAgreementError } from '@/components/web/registration-agreement';
import { onboardInputClass, onboardLabelClass } from '@/components/web/onboard-wizard-shell';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  getCompanyPartnerApplication,
  getMe,
  submitCompanyPartnerApplication,
  type CompanyPartnerApplication,
} from '@/lib/api';

type BecomePartnerPageProps = {
  params: Promise<{ locale: string }>;
};

export default function BecomePartnerPage({ params }: BecomePartnerPageProps) {
  const t = useTranslations('web.app.partner');
  const { isLoaded, getToken } = useAuth();
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<CompanyPartnerApplication | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [message, setMessage] = useState('');
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [agreedToFee, setAgreedToFee] = useState(false);
  const [understoodFlow, setUnderstoodFlow] = useState(false);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const [me, app] = await Promise.all([getMe(token), getCompanyPartnerApplication(token)]);
    if (me?.phone) setContactPhone((prev) => prev || me.phone || '');
    setApplication(app);
    if (app?.companyName) setCompanyName((prev) => prev || app.companyName);
    setLoading(false);
  }, [getToken]);

  useEffect(() => {
    void params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  useEffect(() => {
    if (!isLoaded) return;
    void load();
  }, [isLoaded, load]);

  const canSubmit =
    application?.status !== 'pending_approval' &&
    application?.status !== 'approved' &&
    companyName.trim().length >= 2 &&
    agreedToPolicy &&
    agreedToFee &&
    understoodFlow;

  async function handleSubmit() {
    setError(null);
    const agreementError = registrationAgreementError(agreedToPolicy, agreedToFee);
    if (agreementError) {
      setError(agreementError);
      return;
    }
    if (!understoodFlow) {
      setError(t('flowAckRequired'));
      return;
    }
    const token = await getToken();
    if (!token) return;
    setSaving(true);
    try {
      const result = await submitCompanyPartnerApplication(token, {
        companyName: companyName.trim(),
        contactPhone: contactPhone.trim() || undefined,
        workAddress: workAddress.trim() || undefined,
        tinNumber: tinNumber.trim() || undefined,
        message: message.trim() || undefined,
        acceptedTerms: agreedToPolicy,
        acceptedPlatformFee: agreedToFee,
        understoodBookingFlow: understoodFlow,
      });
      setApplication(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('submitFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader locale={locale} />
        <AppLoadingSkeleton />
      </div>
    );
  }

  const status = application?.status;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader locale={locale} />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Link href={`/${locale}/app`} className="text-sm font-semibold text-brand hover:underline">
          ← {t('backDashboard')}
        </Link>
        <h1 className="mt-4 text-2xl font-black text-foreground">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>

        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">{t('beforeYouApply')}</h2>
          <div className="mt-4">
            <PartnerBookingInstructions locale={locale} />
          </div>
        </section>

        {status === 'pending_approval' ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-bold">{t('pendingTitle')}</p>
            <p className="mt-2">{t('pendingBody', { company: application?.companyName ?? '' })}</p>
          </div>
        ) : null}

        {status === 'approved' ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <p className="font-bold">{t('approvedTitle')}</p>
            <p className="mt-2">{t('approvedBody', { company: application?.companyName ?? '' })}</p>
            <Link
              href={`/${locale}/onboard/car`}
              className="mt-4 inline-block text-sm font-bold text-brand hover:underline"
            >
              {t('addFleetCta')}
            </Link>
          </div>
        ) : null}

        {status === 'rejected' ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
            <p className="font-bold">{t('rejectedTitle')}</p>
            {application?.rejectionReason ? (
              <p className="mt-2">
                <span className="font-semibold">{t('rejectionReason')}:</span> {application.rejectionReason}
              </p>
            ) : null}
            <p className="mt-2 text-red-800/90">{t('rejectedHint')}</p>
          </div>
        ) : null}

        {status !== 'pending_approval' && status !== 'approved' ? (
          <form
            className="mt-8 space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <div>
              <label className={onboardLabelClass} htmlFor="partner-company">
                {t('companyName')}
              </label>
              <input
                id="partner-company"
                className={onboardInputClass}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t('companyNamePlaceholder')}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={onboardLabelClass} htmlFor="partner-phone">
                  {t('contactPhone')}
                </label>
                <input
                  id="partner-phone"
                  className={onboardInputClass}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                />
              </div>
              <div>
                <label className={onboardLabelClass} htmlFor="partner-tin">
                  {t('tinOptional')}
                </label>
                <input
                  id="partner-tin"
                  className={onboardInputClass}
                  value={tinNumber}
                  onChange={(e) => setTinNumber(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={onboardLabelClass} htmlFor="partner-address">
                {t('workAddress')}
              </label>
              <input
                id="partner-address"
                className={onboardInputClass}
                value={workAddress}
                onChange={(e) => setWorkAddress(e.target.value)}
                placeholder={t('workAddressPlaceholder')}
              />
            </div>
            <div>
              <label className={onboardLabelClass} htmlFor="partner-message">
                {t('messageOptional')}
              </label>
              <textarea
                id="partner-message"
                className={`${onboardInputClass} min-h-[88px] resize-y`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('messagePlaceholder')}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <RegistrationAgreement
                locale={locale}
                agreedToPolicy={agreedToPolicy}
                agreedToFee={agreedToFee}
                onPolicyChange={setAgreedToPolicy}
                onFeeChange={setAgreedToFee}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
              <input
                type="checkbox"
                checked={understoodFlow}
                onChange={(e) => setUnderstoodFlow(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-brand"
              />
              <span>{t('flowAck')}</span>
            </label>

            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

            <Button type="submit" disabled={!canSubmit || saving}>
              {saving ? t('submitting') : t('submitRequest')}
            </Button>
          </form>
        ) : null}
      </main>
    </div>
  );
}