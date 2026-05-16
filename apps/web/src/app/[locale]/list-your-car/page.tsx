'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { IllustrationListCar } from '@/components/web/illustrations';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { useAuth } from '@clerk/nextjs';
import { BadgeCheck, Camera, Car, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function ListYourCarPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f0e8]">
      <AppHeader locale={locale} />

      {/* Hero */}
      <section className="border-b-2 border-neutral-900 bg-teal-600 px-4 py-12 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <div className="mb-4 flex justify-center md:justify-start">
              <span className="flex h-14 w-14 items-center justify-center rounded-md border-2 border-white/30 bg-white/10">
                <Car className="h-8 w-8 text-teal-100" />
              </span>
            </div>
            <h1 className="text-4xl font-black sm:text-5xl">List Your Car on renting.rw</h1>
            <p className="mt-4 max-w-lg text-lg font-medium text-teal-50">
              Turn your idle vehicle into a source of income. Reach thousands of verified renters across
              Rwanda with full control over your pricing and availability.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start sm:justify-center">
              {isSignedIn ? (
                <Link
                  href={`/${locale}/app/cars`}
                  className="rounded border-2 border-neutral-900 bg-white px-8 py-3 font-black uppercase tracking-wide text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  Go to My Cars
                </Link>
              ) : (
                <Link
                  href={`/${locale}/app`}
                  className="rounded border-2 border-neutral-900 bg-white px-8 py-3 font-black uppercase tracking-wide text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  Get Started — It&apos;s Free
                </Link>
              )}
              <Link
                href={`/${locale}/how-it-works`}
                className="rounded border-2 border-white/40 bg-white/10 px-8 py-3 font-black uppercase tracking-wide text-white transition-all hover:border-white/70"
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
        <h2 className="mb-10 text-center text-2xl font-black text-neutral-900">Why List With Us?</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <DollarSign className="h-8 w-8 text-teal-600" />,
              title: 'Earn on Your Schedule',
              desc: 'Set your own daily rates for Kigali and countryside trips. Block dates when you need your car.',
            },
            {
              icon: <BadgeCheck className="h-8 w-8 text-teal-600" />,
              title: 'Verified Renters Only',
              desc: 'Our trust score system filters out low-trust users. You choose who gets your car.',
            },
            {
              icon: <Camera className="h-8 w-8 text-teal-600" />,
              title: 'Easy Listing',
              desc: 'Create a listing in minutes with photos, features, and pricing. No technical skills needed.',
            },
            {
              icon: <TrendingUp className="h-8 w-8 text-teal-600" />,
              title: 'Grow Your Business',
              desc: 'Collect reviews, build your reputation, and unlock more bookings with our subscription tiers.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-md border-2 border-neutral-900 bg-white p-5 shadow-brutal">
              <div className="mb-3">{item.icon}</div>
              <h3 className="mb-2 font-black text-neutral-900">{item.title}</h3>
              <p className="text-sm font-medium text-neutral-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="border-t-2 border-b-2 border-neutral-900 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-black text-neutral-900">Getting Started in 4 Steps</h2>
          <ol className="space-y-5">
            {[
              { step: '1', title: 'Create an account', desc: 'Sign up with your email in under 2 minutes.' },
              { step: '2', title: 'Verify your identity', desc: 'Submit your national ID for KYC. This unlocks the car_owner role.' },
              { step: '3', title: 'Create your listing', desc: 'Add photos, set your price, choose your availability. Use the listing wizard from your dashboard.' },
              { step: '4', title: 'Accept your first booking', desc: 'Respond to booking requests within 1 hour and start earning.' },
            ].map((s) => (
              <li key={s.step} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-neutral-900 bg-neutral-900 text-white font-black shadow-brutal-xs">
                  {s.step}
                </span>
                <div className="pt-1.5">
                  <p className="font-black text-neutral-900">{s.title}</p>
                  <p className="mt-0.5 text-sm font-medium text-neutral-600">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-14 text-center sm:px-6">
        <h2 className="mb-3 text-2xl font-black text-neutral-900">Ready to start earning?</h2>
        <p className="mb-6 font-medium text-neutral-600">Join car owners across Rwanda already earning on renting.rw.</p>
        <Link
          href={isSignedIn ? `/${locale}/app/cars` : `/${locale}/app`}
          className="inline-block rounded border-2 border-teal-800 bg-teal-600 px-10 py-3 font-black uppercase tracking-wide text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
        >
          {isSignedIn ? 'Manage My Cars' : 'Create Free Account'}
        </Link>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
