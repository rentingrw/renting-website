'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { IllustrationSafety } from '@/components/web/illustrations';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { AlertCircle, BadgeCheck, Lock, Phone, Shield, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function SafetyPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('web.safety');
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  const pillars = [
    { icon: <BadgeCheck className="h-8 w-8 text-brand" />, title: t('planTitle'), desc: t('planDesc') },
    { icon: <ShieldCheck className="h-8 w-8 text-brand" />, title: t('trustTitle'), desc: t('trustDesc') },
    { icon: <Lock className="h-8 w-8 text-brand" />, title: t('payTitle'), desc: t('payDesc') },
    { icon: <Phone className="h-8 w-8 text-brand" />, title: t('contactTitle'), desc: t('contactDesc') },
    { icon: <AlertCircle className="h-8 w-8 text-brand" />, title: t('disputeTitle'), desc: t('disputeDesc') },
    { icon: <Phone className="h-8 w-8 text-brand" />, title: t('supportTitle'), desc: t('supportDesc') },
  ];

  const renterTips = [t('renterTip1'), t('renterTip2'), t('renterTip3'), t('renterTip4'), t('renterTip5'), t('renterTip6')];
  const ownerTips = [t('ownerTip1'), t('ownerTip2'), t('ownerTip3'), t('ownerTip4'), t('ownerTip5'), t('ownerTip6')];

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppHeader locale={locale} />

      <section className="bg-background px-4 py-14 text-foreground">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <div className="mb-4 flex justify-center md:justify-start">
              <span className="flex h-14 w-14 items-center justify-center rounded-md border-2 border-border bg-muted">
                <Shield className="h-8 w-8 text-foreground/70" />
              </span>
            </div>
            <h1 className="text-4xl font-black sm:text-5xl">{t('title')}</h1>
            <p className="mt-4 max-w-lg text-lg font-medium text-muted-foreground">{t('subtitle')}</p>
          </div>
          <IllustrationSafety className="w-full max-w-[220px] shrink-0" />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-black text-foreground">{t('pillarsTitle')}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3">{item.icon}</div>
              <h3 className="mb-2 font-black text-foreground">{item.title}</h3>
              <p className="text-sm font-medium text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t-2 border-b-2 border-border bg-amber-50 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-xl font-black text-foreground">{t('renterTipsTitle')}</h2>
          <ul className="space-y-3">
            {renterTips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm font-medium text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-amber-600 bg-amber-400 text-xs font-black text-amber-900">
                  {i + 1}
                </span>
                <span className="pt-0.5">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b-2 border-border bg-card px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-xl font-black text-foreground">{t('ownerTipsTitle')}</h2>
          <ul className="space-y-3">
            {ownerTips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm font-medium text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-brand bg-brand-soft text-xs font-black text-brand-strong">
                  {i + 1}
                </span>
                <span className="pt-0.5">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b-2 border-border bg-red-50 px-4 py-10 text-center sm:px-6">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md border-2 border-red-600 bg-card shadow-brutal-xs">
          <Phone className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="mb-1 text-lg font-black text-foreground">{t('emergencyTitle')}</h2>
        <p className="mb-4 text-sm font-medium text-muted-foreground">{t('emergencyDesc')}</p>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <a
            href="tel:+250788781648"
            className="rounded border-2 border-red-700 bg-red-600 px-6 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            {t('call')}
          </a>
          <a
            href="mailto:renting.rw@gmail.com"
            className="rounded border-2 border-red-600 bg-card px-6 py-2.5 text-sm font-black uppercase tracking-wide text-red-600 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            renting.rw@gmail.com
          </a>
        </div>
      </section>

      <div className="flex-1" />
      <SiteFooter locale={locale} />
    </main>
  );
}
