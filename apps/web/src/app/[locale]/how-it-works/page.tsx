'use client';

import { AppHeader } from '@/components/web/app-header';
import { MarketingCard } from '@/components/web/marketing-card';
import { MarketingPageHero } from '@/components/web/marketing-page-hero';
import { SiteFooter } from '@/components/web/site-footer';
import { IllustrationHowItWorks, IllustrationDriver, IllustrationSearch } from '@/components/web/illustrations';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { CalendarDays, Car, CheckCircle, FileSignature, Search, Star, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('web.howItWorks');
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  const renterSteps = [
    { icon: <Search className="h-7 w-7 text-brand" />, title: t('renterSearchTitle'), desc: t('renterSearchDesc') },
    { icon: <Car className="h-7 w-7 text-brand" />, title: t('renterChooseTitle'), desc: t('renterChooseDesc') },
    { icon: <CalendarDays className="h-7 w-7 text-brand" />, title: t('renterBookTitle'), desc: t('renterBookDesc') },
    { icon: <CheckCircle className="h-7 w-7 text-brand" />, title: t('renterEnjoyTitle'), desc: t('renterEnjoyDesc') },
  ];

  const ownerSteps = [
    { icon: <Car className="h-7 w-7 text-brand" />, title: t('ownerListTitle'), desc: t('ownerListDesc') },
    { icon: <CheckCircle className="h-7 w-7 text-brand" />, title: t('ownerLiveTitle'), desc: t('ownerLiveDesc') },
    { icon: <CalendarDays className="h-7 w-7 text-brand" />, title: t('ownerConfirmTitle'), desc: t('ownerConfirmDesc') },
    { icon: <Star className="h-7 w-7 text-brand" />, title: t('ownerEarnTitle'), desc: t('ownerEarnDesc') },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppHeader locale={locale} />

      <MarketingPageHero eyebrow={t('kicker')} title={t('title')} subtitle={t('subtitle')}>
        <IllustrationHowItWorks className="w-full opacity-90" />
      </MarketingPageHero>

      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-brand text-white shadow-brutal-xs">
              <UserRound className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-black text-foreground">{t('rentersTitle')}</h2>
          </div>
          <IllustrationSearch className="w-full max-w-[200px] shrink-0 opacity-80" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {renterSteps.map((step, i) => (
            <MarketingCard key={step.title} className="relative">
              <span className="absolute right-4 top-4 text-3xl font-black text-neutral-100">{i + 1}</span>
              <div className="mb-3">{step.icon}</div>
              <h3 className="mb-2 font-black text-foreground">{step.title}</h3>
              <p className="text-sm font-medium text-muted-foreground">{step.desc}</p>
            </MarketingCard>
          ))}
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <hr className="border-t-2 border-border" />
      </div>

      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-brand bg-brand text-white shadow-brutal-xs">
              <Car className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-black text-foreground">{t('ownersTitle')}</h2>
          </div>
          <IllustrationDriver className="w-full max-w-[180px] shrink-0 opacity-80" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ownerSteps.map((step, i) => (
            <MarketingCard key={step.title} className="relative">
              <span className="absolute right-4 top-4 text-3xl font-black text-neutral-100">{i + 1}</span>
              <div className="mb-3">{step.icon}</div>
              <h3 className="mb-2 font-black text-foreground">{step.title}</h3>
              <p className="text-sm font-medium text-muted-foreground">{step.desc}</p>
            </MarketingCard>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6">
        <MarketingCard className="flex gap-4 border-brand/25 bg-brand-soft/40 p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-brand">
            <FileSignature className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-black text-foreground">{t('contractTitle')}</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">{t('contractDesc')}</p>
          </div>
        </MarketingCard>
      </section>

      <div className="flex-1" />
      <SiteFooter locale={locale} />
    </main>
  );
}
