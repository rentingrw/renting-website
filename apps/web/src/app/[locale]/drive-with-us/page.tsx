'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { IllustrationDriver } from '@/components/web/illustrations';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { useAuth } from '@clerk/nextjs';
import { BadgeCheck, CalendarDays, Clock, DollarSign, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DriveWithUsPage({ params }: { params: Promise<{ locale: string }> }) {
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
            <UserRound className="mb-4 h-12 w-12 text-teal-200 mx-auto md:mx-0" />
            <h1 className="text-4xl font-extrabold sm:text-5xl">Drive With renting.rw</h1>
            <p className="mt-4 max-w-lg text-lg text-teal-100">
              Set your own hours, choose your service categories, and connect with clients who need a
              professional driver across Rwanda.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start sm:justify-center">
              {isSignedIn ? (
                <Link
                  href={`/${locale}/app/settings`}
                  className="rounded-full bg-white px-8 py-3 font-semibold text-teal-700 shadow hover:bg-teal-50"
                >
                  Complete Driver Profile
                </Link>
              ) : (
                <Link
                  href={`/${locale}/app`}
                  className="rounded-full bg-white px-8 py-3 font-semibold text-teal-700 shadow hover:bg-teal-50"
                >
                  Apply to Drive — Free
                </Link>
              )}
            </div>
          </div>
          <IllustrationDriver className="w-full max-w-[220px] shrink-0" />
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">Why Drive With Us?</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <DollarSign className="h-8 w-8 text-teal-600" />,
              title: 'Competitive Earnings',
              desc: 'Set your own hourly, daily, and weekly rates. Earn more for specialized services.',
            },
            {
              icon: <CalendarDays className="h-8 w-8 text-teal-600" />,
              title: 'Flexible Schedule',
              desc: 'Choose when you work. Accept bookings that fit your availability, not the other way around.',
            },
            {
              icon: <BadgeCheck className="h-8 w-8 text-teal-600" />,
              title: 'Verified Clients',
              desc: 'All clients are registered and verified. Our trust system protects you from problem bookings.',
            },
            {
              icon: <Clock className="h-8 w-8 text-teal-600" />,
              title: 'Grow Your Reputation',
              desc: 'Collect reviews, build your trust score, and get featured to attract more clients.',
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

      {/* Service categories */}
      <section className="bg-gray-50 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">Service Categories</h2>
          <p className="mb-8 text-center text-gray-600 text-sm">
            Add the services you offer and clients looking for those specific services will find you.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              'Airport Transfers',
              'City Trips',
              'Long-Distance',
              'Wedding & Events',
              'Corporate',
              'Tourism & Tours',
              'Night Driving',
              'VIP Service',
              'School Runs',
            ].map((cat) => (
              <div
                key={cat}
                className="rounded-xl border border-teal-100 bg-white px-4 py-3 text-center text-sm font-medium text-teal-700 shadow-sm"
              >
                {cat}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">How to Join as a Driver</h2>
        <ol className="space-y-6">
          {[
            { step: '1', title: 'Sign up', desc: 'Create a free account with your name and email.' },
            { step: '2', title: 'Add the driver role', desc: 'Go to Settings → Roles & Access and add the driver role to your profile.' },
            { step: '3', title: 'Complete KYC', desc: 'Upload your driver\'s license and national ID for verification. Verified drivers earn more.' },
            { step: '4', title: 'Set your rates', desc: 'Add your hourly, daily, and weekly rates plus your service categories.' },
            { step: '5', title: 'Publish and get booked', desc: 'Go live and start receiving booking requests from clients near you.' },
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
      </section>

      {/* CTA */}
      <section className="bg-teal-700 px-4 py-14 text-center text-white sm:px-6">
        <h2 className="mb-3 text-2xl font-bold">Start Driving on Your Terms</h2>
        <p className="mb-6 text-teal-100">
          Join professional drivers across Rwanda already earning with renting.rw.
        </p>
        <Link
          href={isSignedIn ? `/${locale}/app/settings` : `/${locale}/app`}
          className="inline-block rounded-full bg-white px-10 py-3 font-semibold text-teal-700 shadow hover:bg-teal-50"
        >
          {isSignedIn ? 'Set Up Driver Profile' : 'Join as a Driver'}
        </Link>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
