'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { IllustrationHowItWorks, IllustrationDriver, IllustrationSearch } from '@/components/web/illustrations';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { Car, CheckCircle, MessageCircle, Search, Star, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  const renterSteps = [
    {
      icon: <Search className="h-7 w-7 text-teal-600" />,
      title: 'Search',
      desc: 'Enter your location and dates. Browse cars and drivers available in your area with prices and trust badges.',
    },
    {
      icon: <Car className="h-7 w-7 text-teal-600" />,
      title: 'Choose',
      desc: 'Compare listings by price, vehicle type, driver rating, and proximity. Read reviews from verified renters.',
    },
    {
      icon: <MessageCircle className="h-7 w-7 text-teal-600" />,
      title: 'Book',
      desc: 'Send a booking request with your pickup location and dates. The owner has 1 hour to confirm.',
    },
    {
      icon: <CheckCircle className="h-7 w-7 text-teal-600" />,
      title: 'Enjoy',
      desc: 'Pick up your car or meet your driver. Pay at confirmation. Leave a review to help the community.',
    },
  ];

  const ownerSteps = [
    {
      icon: <Car className="h-7 w-7 text-teal-600" />,
      title: 'List Your Car',
      desc: 'Create a listing with photos, price, and availability. Publish with a subscription — free tier available.',
    },
    {
      icon: <CheckCircle className="h-7 w-7 text-teal-600" />,
      title: 'Get Verified',
      desc: 'Complete KYC verification to boost your trust score and attract more bookings.',
    },
    {
      icon: <MessageCircle className="h-7 w-7 text-teal-600" />,
      title: 'Respond to Requests',
      desc: 'Confirm or decline booking requests within 1 hour. Chat with renters via built-in messaging.',
    },
    {
      icon: <Star className="h-7 w-7 text-teal-600" />,
      title: 'Earn & Grow',
      desc: 'Earn income on your terms. Build your reputation with reviews to unlock more bookings.',
    },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f0e8]">
      <AppHeader locale={locale} />

      {/* Hero */}
      <section className="border-b-2 border-neutral-900 bg-teal-600 px-4 py-12 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-teal-100">Simple &amp; Transparent</p>
            <h1 className="text-4xl font-black sm:text-5xl">How It Works</h1>
            <p className="mt-4 max-w-lg text-lg font-medium text-teal-50">
              Whether you&apos;re renting a car, hiring a driver, or listing your vehicle — the process is
              straightforward and secure.
            </p>
          </div>
          <IllustrationHowItWorks className="w-full max-w-xs shrink-0 md:max-w-sm" />
        </div>
      </section>

      {/* For Renters */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-neutral-900 bg-teal-600 text-white shadow-brutal-xs">
              <UserRound className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-black text-neutral-900">For Renters &amp; Customers</h2>
          </div>
          <IllustrationSearch className="w-full max-w-[200px] shrink-0 opacity-80" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {renterSteps.map((step, i) => (
            <div key={step.title} className="relative rounded-md border-2 border-neutral-900 bg-white p-5 shadow-brutal">
              <span className="absolute right-4 top-4 text-3xl font-black text-neutral-100">{i + 1}</span>
              <div className="mb-3">{step.icon}</div>
              <h3 className="mb-2 font-black text-neutral-900">{step.title}</h3>
              <p className="text-sm font-medium text-neutral-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <hr className="border-t-2 border-neutral-900" />
      </div>

      {/* For Owners */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-neutral-900 bg-neutral-900 text-white shadow-brutal-xs">
              <Car className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-black text-neutral-900">For Car Owners &amp; Drivers</h2>
          </div>
          <IllustrationDriver className="w-full max-w-[180px] shrink-0 opacity-80" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ownerSteps.map((step, i) => (
            <div key={step.title} className="relative rounded-md border-2 border-neutral-900 bg-white p-5 shadow-brutal">
              <span className="absolute right-4 top-4 text-3xl font-black text-neutral-100">{i + 1}</span>
              <div className="mb-3">{step.icon}</div>
              <h3 className="mb-2 font-black text-neutral-900">{step.title}</h3>
              <p className="text-sm font-medium text-neutral-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust system callout */}
      <section className="border-t-2 border-b-2 border-neutral-900 bg-teal-600 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md border-2 border-white/30 bg-white/10">
            <CheckCircle className="h-7 w-7 text-white" />
          </div>
          <h2 className="mb-2 text-xl font-black">Powered by a Trust Score System</h2>
          <p className="font-medium text-teal-50">
            Every user on renting.rw has a public trust score based on their verification level,
            booking history, and reviews. Higher scores mean more visibility and faster approvals.
          </p>
        </div>
      </section>

      <div className="flex-1" />
      <SiteFooter locale={locale} />
    </main>
  );
}
