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
    <main className="flex min-h-screen flex-col">
      <AppHeader locale={locale} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-700 to-teal-900 px-4 py-12 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <Car className="mb-4 h-12 w-12 text-teal-200 mx-auto md:mx-0" />
            <h1 className="text-4xl font-extrabold sm:text-5xl">List Your Car on renting.rw</h1>
            <p className="mt-4 max-w-lg text-lg text-teal-100">
              Turn your idle vehicle into a source of income. Reach thousands of verified renters across
              Rwanda with full control over your pricing and availability.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start sm:justify-center">
              {isSignedIn ? (
                <Link
                  href={`/${locale}/app/cars`}
                  className="rounded-full bg-white px-8 py-3 font-semibold text-teal-700 shadow hover:bg-teal-50"
                >
                  Go to My Cars
                </Link>
              ) : (
                <Link
                  href={`/${locale}/app`}
                  className="rounded-full bg-white px-8 py-3 font-semibold text-teal-700 shadow hover:bg-teal-50"
                >
                  Get Started — It&apos;s Free
                </Link>
              )}
              <Link
                href={`/${locale}/how-it-works`}
                className="rounded-full border border-white/50 px-8 py-3 font-semibold text-white hover:border-white"
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
        <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">Why List With Us?</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
            <div key={item.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-3">{item.icon}</div>
              <h3 className="mb-2 font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="bg-gray-50 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Getting Started in 4 Steps</h2>
          <ol className="space-y-6">
            {[
              { step: '1', title: 'Create an account', desc: 'Sign up with your email in under 2 minutes.' },
              { step: '2', title: 'Verify your identity', desc: 'Submit your national ID for KYC. This unlocks the car_owner role.' },
              { step: '3', title: 'Create your listing', desc: 'Add photos, set your price, choose your availability. Use the listing wizard from your dashboard.' },
              { step: '4', title: 'Accept your first booking', desc: 'Respond to booking requests within 1 hour and start earning.' },
            ].map((s) => (
              <li key={s.step} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white font-bold">
                  {s.step}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{s.title}</p>
                  <p className="text-sm text-gray-600">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-14 text-center sm:px-6">
        <h2 className="mb-3 text-2xl font-bold text-gray-900">Ready to start earning?</h2>
        <p className="mb-6 text-gray-600">Join car owners across Rwanda already earning on renting.rw.</p>
        <Link
          href={isSignedIn ? `/${locale}/app/cars` : `/${locale}/app`}
          className="inline-block rounded-full bg-teal-600 px-10 py-3 font-semibold text-white shadow hover:bg-teal-700"
        >
          {isSignedIn ? 'Manage My Cars' : 'Create Free Account'}
        </Link>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
