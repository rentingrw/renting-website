'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b-2 border-border last:border-b-0 ${open ? 'bg-brand-soft' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-0 py-4 text-left"
      >
        <span className="pr-4 font-black text-foreground">{q}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-brand" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <p className="pb-4 text-sm font-medium leading-relaxed text-muted-foreground">{a}</p>}
    </div>
  );
}

export default function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('web.faq');
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  const sections = [
    {
      category: t('catBooking'),
      items: [
        { q: t('bookingQ1'), a: t('bookingA1') },
        { q: t('bookingQ2'), a: t('bookingA2') },
        { q: t('bookingQ3'), a: t('bookingA3') },
        { q: t('bookingQ4'), a: t('bookingA4') },
      ],
    },
    {
      category: t('catPayments'),
      items: [
        { q: t('payQ1'), a: t('payA1') },
        { q: t('payQ2'), a: t('payA2') },
        { q: t('payQ3'), a: t('payA3') },
      ],
    },
    {
      category: t('catOwners'),
      items: [
        { q: t('ownerQ1'), a: t('ownerA1') },
        { q: t('ownerQ2'), a: t('ownerA2') },
        { q: t('ownerQ3'), a: t('ownerA3') },
        { q: t('ownerQ4'), a: t('ownerA4') },
      ],
    },
    {
      category: t('catTrust'),
      items: [
        { q: t('trustQ1'), a: t('trustA1') },
        { q: t('trustQ2'), a: t('trustA2') },
        { q: t('trustQ3'), a: t('trustA3') },
      ],
    },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppHeader locale={locale} />

      <section className="bg-background px-4 py-20 text-center text-foreground">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-foreground/70">{t('kicker')}</p>
        <h1 className="text-4xl font-black sm:text-5xl">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-muted-foreground">{t('subtitle')}</p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        {sections.map((section) => (
          <div key={section.category} className="mb-10">
            <h2 className="mb-1 inline-block rounded border-2 border-border bg-brand px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
              {section.category}
            </h2>
            <div className="mt-3 rounded-md border-2 border-border bg-card px-5 shadow-brutal">
              {section.items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="border-t-2 border-border bg-card px-4 py-12 text-center sm:px-6">
        <h2 className="mb-2 text-xl font-black text-foreground">{t('stillTitle')}</h2>
        <p className="mb-6 font-medium text-muted-foreground">{t('stillDesc')}</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="tel:+250788781648"
            className="rounded border-2 border-brand-strong bg-brand px-6 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            0788 781 648
          </a>
          <a
            href="mailto:renting.rw@gmail.com"
            className="rounded border-2 border-border bg-card px-6 py-2.5 text-sm font-black uppercase tracking-wide text-foreground shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            {t('emailUs')}
          </a>
        </div>
      </section>

      <div className="flex-1" />
      <SiteFooter locale={locale} />
    </main>
  );
}
