'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { IllustrationAbout, IllustrationCarRental } from '@/components/web/illustrations';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { Car, MapPin, ShieldCheck, Star, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  return (
    <main className="flex min-h-screen flex-col">
      <AppHeader locale={locale} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-700 to-teal-900 px-4 py-16 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-200">Our Story</p>
            <h1 className="text-4xl font-extrabold sm:text-5xl">About renting.rw</h1>
            <p className="mt-4 max-w-xl text-lg text-teal-100">
              Rwanda&apos;s most trusted marketplace for car rentals and professional drivers — built by
              CARIRWA LTD to make mobility seamless, safe, and accessible.
            </p>
          </div>
          <IllustrationAbout className="w-full max-w-xs shrink-0 md:max-w-sm" />
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed">
              renting.rw was founded with a simple belief: getting around Rwanda should be easy,
              transparent, and trustworthy. We connect verified car owners and professional drivers
              with people who need reliable transportation — whether it&apos;s a day trip to Musanze,
              an airport transfer, or a full week across the country.
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Every listing on our platform goes through a verification process. Every driver has a
              background check. Every booking is protected by our trust system.
            </p>
          </div>
          <div>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Who We Are</h2>
            <p className="text-gray-600 leading-relaxed">
              We are <strong>CARIRWA LTD</strong>, a Rwanda-registered company headquartered in
              Kigali. Our team combines deep local knowledge with modern technology to build a
              marketplace that works for Rwandans and visitors alike.
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">
              renting.rw is our flagship product — a platform that puts safety, reliability, and
              fair pricing at the center of every transaction.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">What We Stand For</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <ShieldCheck className="h-8 w-8 text-teal-600" />,
                title: 'Trust & Safety',
                desc: 'All hosts and drivers are verified. Our trust score system keeps standards high.',
              },
              {
                icon: <Star className="h-8 w-8 text-teal-600" />,
                title: 'Quality First',
                desc: 'Only well-maintained vehicles and professional drivers make it onto the platform.',
              },
              {
                icon: <Car className="h-8 w-8 text-teal-600" />,
                title: 'Local Expertise',
                desc: 'Built by Rwandans, for Rwanda. We know the roads, the cities, the culture.',
              },
              {
                icon: <Users className="h-8 w-8 text-teal-600" />,
                title: 'Community',
                desc: 'We empower car owners and drivers to build sustainable income through our platform.',
              },
            ].map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-3">{v.icon}</div>
                <h3 className="mb-2 font-semibold text-gray-900">{v.title}</h3>
                <p className="text-sm text-gray-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Car illustration banner */}
      <section className="bg-teal-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <IllustrationCarRental className="mx-auto w-full max-w-lg" />
        </div>
      </section>

      {/* Headquarters */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <MapPin className="mx-auto mb-3 h-8 w-8 text-teal-600" />
        <h2 className="mb-3 text-2xl font-bold text-gray-900">Find Us</h2>
        <p className="text-gray-600">
          CARIRWA LTD — Kigali, Rwanda
          <br />
          <a href="tel:+250788781648" className="text-teal-600 hover:underline">
            0788 781 648
          </a>
          {' · '}
          <a href="mailto:renting.rw@gmail.com" className="text-teal-600 hover:underline">
            renting.rw@gmail.com
          </a>
        </p>
      </section>

      <div className="flex-1" />
      <SiteFooter locale={locale} />
    </main>
  );
}
