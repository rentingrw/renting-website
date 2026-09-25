'use client';

import { AppHeader } from '@/components/web/app-header';
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

      {/* Hero */}
      <section className="bg-background px-4 py-12 text-foreground">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <div className="mb-4 flex justify-center md:justify-start">
              <span className="flex h-14 w-14 items-center justify-center rounded-md border-2 border-border bg-muted">
                <Car className="h-8 w-8 text-foreground/70" />
              </span>
            </div>
            <h1 className="text-4xl font-black sm:text-5xl">List Your Car on renting.rw</h1>
            <p className="mt-4 max-w-lg text-lg font-medium text-muted-foreground">
              Turn your idle vehicle into a source of income. Reach thousands of verified renters across
              Rwanda with full control over your pricing and availability.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start sm:justify-center">
              <Link
                href={`/${locale}/onboard/hoster`}
                className="rounded-full bg-brand px-8 py-3 font-semibold text-white transition hover:bg-brand-hover"
              >
                Start hosting
              </Link>
              <Link
                href={`/${locale}/how-it-works`}
                className="rounded-full border border-border bg-white px-8 py-3 font-semibold text-foreground transition hover:bg-muted"
              >
                How It Works
              </Link>
            </div>
          </div>
          <IllustrationListCar className="w-full max-w-[260px] shrink-0" />
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
              desc: 'Set your own daily rates for Kigali and countryside trips. Block dates when you need your car.',
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
              desc: 'Collect reviews, build your reputation, and unlock more bookings with our subscription tiers.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3">{item.icon}</div>
              <h3 className="mb-2 font-black text-foreground">{item.title}</h3>
              <p className="text-sm font-medium text-muted-foreground">{item.desc}</p>
            </div>
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
              { step: '2', title: 'Complete hoster onboarding', desc: 'Add your details, choose a plan, and pay or apply a promo. You are not searchable until that succeeds.' },
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
          href={`/${locale}/onboard/hoster`}
          className="inline-block rounded border-2 border-brand-strong bg-brand px-10 py-3 font-black uppercase tracking-wide text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
        >
          Start hosting
        </Link>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
