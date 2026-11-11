'use client';

import { AppHeader } from '@/components/web/app-header';
import { MarketingCard } from '@/components/web/marketing-card';
import { MarketingPageHero } from '@/components/web/marketing-page-hero';
import { SiteFooter } from '@/components/web/site-footer';
import { IllustrationListCar } from '@/components/web/illustrations';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { BadgeCheck, Camera, Car, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function ListYourCarPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppHeader locale={locale} />

      <MarketingPageHero
        eyebrow="Partners"
        title="List your car on renting.rw"
        subtitle="Turn your idle vehicle into income. Reach verified renters across Rwanda with full control over pricing and availability."
      >
        <IllustrationListCar className="w-full max-w-[260px]" />
      </MarketingPageHero>
      <section className="border-b border-border bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 sm:flex-row md:justify-start">
          <Link
            href={`/${locale}/onboard/car`}
            className="rounded-full bg-gradient-to-br from-[#1f4a3f] via-brand to-brand-strong px-8 py-3 text-sm font-bold text-white hover:brightness-110"
          >
            Start hosting
          </Link>
          <Link
            href={`/${locale}/how-it-works`}
            className="rounded-full border border-border bg-card px-8 py-3 text-sm font-bold text-foreground transition hover:border-ink hover:bg-ink hover:text-white"
          >
            How it works
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-black text-foreground">Why List With Us?</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <DollarSign className="h-8 w-8 text-brand" />,
              title: 'Earn on Your Schedule',
              desc: 'Set daily, weekly, and monthly rates in your listing city and outside it. Block dates when you need your car.',
            },
            {
              icon: <BadgeCheck className="h-8 w-8 text-brand" />,
              title: 'Trusted renters',
              desc: 'Our trust score system filters out low-trust users. You choose who gets your car.',
            },
            {
              icon: <Camera className="h-8 w-8 text-brand" />,
              title: 'Easy Listing',
              desc: 'Create a listing in minutes with photos, features, and pricing. No technical skills needed.',
            },
            {
              icon: <TrendingUp className="h-8 w-8 text-brand" />,
              title: 'Grow Your Business',
              desc: 'Collect reviews, build your reputation, and get more bookings over time.',
            },
          ].map((item) => (
            <MarketingCard key={item.title}>
              <div className="mb-3">{item.icon}</div>
              <h3 className="mb-2 font-black text-foreground">{item.title}</h3>
              <p className="text-sm font-medium text-muted-foreground">{item.desc}</p>
            </MarketingCard>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="border-t-2 border-b-2 border-border bg-card px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-black text-foreground">Getting Started in 4 Steps</h2>
          <ol className="space-y-5">
            {[
              { step: '1', title: 'Create an account', desc: 'Sign up with your email in under 2 minutes.' },
              { step: '2', title: 'Complete host onboarding', desc: 'Add your details and host profile so renters know who they are booking with.' },
              { step: '3', title: 'Create your listing', desc: 'Add photos, set your price, choose your availability. Use the listing wizard from your dashboard.' },
              { step: '4', title: 'Get booked', desc: 'The renting.rw desk confirms Standard bookings after calling you. Extra Premium listings book instantly.' },
            ].map((s) => (
              <li key={s.step} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-brand bg-brand text-white font-black shadow-brutal-xs">
                  {s.step}
                </span>
                <div className="pt-1.5">
                  <p className="font-black text-foreground">{s.title}</p>
                  <p className="mt-0.5 text-sm font-medium text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-14 text-center sm:px-6">
        <h2 className="mb-3 text-2xl font-black text-foreground">Ready to start earning?</h2>
        <p className="mb-6 font-medium text-muted-foreground">Join car owners across Rwanda already earning on renting.rw.</p>
        <Link
          href={`/${locale}/onboard/car`}
          className="inline-block rounded border-2 border-brand-strong bg-brand px-10 py-3 font-black uppercase tracking-wide text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
        >
          Start hosting
        </Link>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
