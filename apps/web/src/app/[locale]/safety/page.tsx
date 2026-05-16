'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { IllustrationSafety } from '@/components/web/illustrations';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { AlertCircle, BadgeCheck, Lock, MessageCircle, Phone, Shield, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SafetyPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f0e8]">
      <AppHeader locale={locale} />

      {/* Hero */}
      <section className="border-b-2 border-neutral-900 bg-teal-600 px-4 py-14 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <div className="mb-4 flex justify-center md:justify-start">
              <span className="flex h-14 w-14 items-center justify-center rounded-md border-2 border-white/30 bg-white/10">
                <Shield className="h-8 w-8 text-teal-100" />
              </span>
            </div>
            <h1 className="text-4xl font-black sm:text-5xl">Your Safety Comes First</h1>
            <p className="mt-4 max-w-lg text-lg font-medium text-teal-50">
              renting.rw is built around trust, verification, and accountability — so every trip feels
              safe and every transaction is protected.
            </p>
          </div>
          <IllustrationSafety className="w-full max-w-[220px] shrink-0" />
        </div>
      </section>

      {/* Safety pillars */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-black text-neutral-900">How We Keep You Safe</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <BadgeCheck className="h-8 w-8 text-teal-600" />,
              title: 'Identity Verification',
              desc: 'All users who list cars or offer driving services must submit a national ID and pass our KYC review before being published.',
            },
            {
              icon: <ShieldCheck className="h-8 w-8 text-teal-600" />,
              title: 'Trust Score System',
              desc: 'Every user has a visible trust score — a composite of verification level, completed bookings, and community ratings. Low-trust users face listing restrictions.',
            },
            {
              icon: <Lock className="h-8 w-8 text-teal-600" />,
              title: 'Secure Payments',
              desc: "All transactions go through Flutterwave, a PCI-DSS compliant payment processor. renting.rw never stores card data.",
            },
            {
              icon: <MessageCircle className="h-8 w-8 text-teal-600" />,
              title: 'In-App Messaging',
              desc: 'All communication between renters and hosts happens inside the platform so there is a record of every agreement.',
            },
            {
              icon: <AlertCircle className="h-8 w-8 text-teal-600" />,
              title: 'Dispute Resolution',
              desc: 'Our support team mediates disputes using booking history, messages, and photo evidence. Both parties are protected.',
            },
            {
              icon: <Phone className="h-8 w-8 text-teal-600" />,
              title: '24/7 Support Line',
              desc: 'In an emergency during a trip, call our support line at 0788 781 648. We are available every day including weekends.',
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

      {/* Safety tips for renters */}
      <section className="border-t-2 border-b-2 border-neutral-900 bg-amber-50 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-xl font-black text-neutral-900">Safety Tips for Renters</h2>
          <ul className="space-y-3">
            {[
              'Always verify the car and driver match the listing before starting your trip.',
              'Inspect the vehicle for existing damage and document it with photos before driving.',
              'Never share your payment credentials — all payments happen inside the app.',
              'Share your trip details (pickup, destination, duration) with someone you trust.',
              'Use the in-app chat for all communication — avoid moving conversations off-platform.',
              'If something feels wrong, cancel the trip and contact support immediately.',
            ].map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm font-medium text-neutral-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-amber-600 bg-amber-400 text-xs font-black text-amber-900">
                  {i + 1}
                </span>
                <span className="pt-0.5">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Safety tips for owners */}
      <section className="border-b-2 border-neutral-900 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-xl font-black text-neutral-900">Safety Tips for Car Owners &amp; Drivers</h2>
          <ul className="space-y-3">
            {[
              "Always verify a renter's profile and trust score before accepting a booking.",
              "Document the vehicle's condition with photos before and after every rental.",
              'Set a reasonable security deposit for your vehicle.',
              'Ensure your vehicle has valid insurance and documentation before listing.',
              'Report any suspicious activity or users to support immediately.',
              'Keep your availability calendar up to date to avoid double bookings.',
            ].map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm font-medium text-neutral-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-teal-600 bg-teal-100 text-xs font-black text-teal-800">
                  {i + 1}
                </span>
                <span className="pt-0.5">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Emergency contact */}
      <section className="border-b-2 border-neutral-900 bg-red-50 px-4 py-10 text-center sm:px-6">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md border-2 border-red-600 bg-white shadow-brutal-xs">
          <Phone className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="mb-1 text-lg font-black text-neutral-900">Emergency? Need Help Now?</h2>
        <p className="mb-4 text-sm font-medium text-neutral-600">
          Call our support line or email us and we will respond as fast as possible.
        </p>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <a
            href="tel:+250788781648"
            className="rounded border-2 border-red-700 bg-red-600 px-6 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Call 0788 781 648
          </a>
          <a
            href="mailto:renting.rw@gmail.com"
            className="rounded border-2 border-red-600 bg-white px-6 py-2.5 text-sm font-black uppercase tracking-wide text-red-600 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
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
