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
    <main className="flex min-h-screen flex-col bg-[#f5f0e8]">
      <AppHeader locale={locale} />

      {/* Hero */}
      <section className="border-b-2 border-neutral-900 bg-teal-600 px-4 py-16 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-teal-100">Our Story</p>
            <h1 className="text-4xl font-black sm:text-5xl">About renting.rw</h1>
            <p className="mt-4 max-w-xl text-lg font-medium text-teal-50">
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
            <h2 className="mb-4 text-2xl font-black text-neutral-900">Our Mission</h2>
            <p className="font-medium leading-relaxed text-neutral-600">
              renting.rw was founded with a simple belief: getting around Rwanda should be easy,
              transparent, and trustworthy. We connect verified car owners and professional drivers
              with people who need reliable transportation — whether it&apos;s a day trip to Musanze,
              an airport transfer, or a full week across the country.
            </p>
            <p className="mt-4 font-medium leading-relaxed text-neutral-600">
              Every listing on our platform goes through a verification process. Every driver has a
              background check. Every booking is protected by our trust system.
            </p>
          </div>
          <div>
            <h2 className="mb-4 text-2xl font-black text-neutral-900">Who We Are</h2>
            <p className="font-medium leading-relaxed text-neutral-600">
              We are <strong className="text-neutral-900">CARIRWA LTD</strong>, a Rwanda-registered company headquartered in
              Kigali. Our team combines deep local knowledge with modern technology to build a
              marketplace that works for Rwandans and visitors alike.
            </p>
            <p className="mt-4 font-medium leading-relaxed text-neutral-600">
              renting.rw is our flagship product — a platform that puts safety, reliability, and
              fair pricing at the center of every transaction.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-t-2 border-b-2 border-neutral-900 bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-black text-neutral-900">What We Stand For</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                className="rounded-md border-2 border-neutral-900 bg-white p-5 shadow-brutal"
              >
                <div className="mb-3">{v.icon}</div>
                <h3 className="mb-2 font-black text-neutral-900">{v.title}</h3>
                <p className="text-sm font-medium text-neutral-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Car illustration banner */}
      <section className="border-b-2 border-neutral-900 bg-teal-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <IllustrationCarRental className="mx-auto w-full max-w-lg" />
        </div>
      </section>

      {/* Headquarters */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-md border-2 border-neutral-900 bg-white shadow-brutal">
          <MapPin className="h-7 w-7 text-teal-600" />
        </div>
        <h2 className="mb-3 mt-5 text-2xl font-black text-neutral-900">Find Us</h2>
        <p className="font-medium text-neutral-600">
          CARIRWA LTD — Kigali, Rwanda
          <br />
          <a href="tel:+250788781648" className="font-black text-teal-700 hover:underline">
            0788 781 648
          </a>
          {' · '}
          <a href="mailto:renting.rw@gmail.com" className="font-black text-teal-700 hover:underline">
            renting.rw@gmail.com
          </a>
        </p>
      </section>

      <div className="flex-1" />
      <SiteFooter locale={locale} />
    </main>
  );
}
