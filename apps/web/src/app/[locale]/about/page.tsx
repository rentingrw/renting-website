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
    <main className="flex min-h-screen flex-col bg-background">
      <AppHeader locale={locale} />

      {/* Hero */}
      <section className="bg-background px-4 py-16 text-foreground">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-foreground/70">Our Story</p>
            <h1 className="text-4xl font-black sm:text-5xl">About renting.rw</h1>
            <p className="mt-4 max-w-xl text-lg font-medium text-muted-foreground">
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
            <h2 className="mb-4 text-2xl font-black text-foreground">Our Mission</h2>
            <p className="font-medium leading-relaxed text-muted-foreground">
              renting.rw was founded with a simple belief: getting around Rwanda should be easy,
              transparent, and trustworthy.               We connect car owners and professional drivers
              with people who need reliable transportation — whether it&apos;s a day trip to Musanze,
              an airport transfer, or a full week across the country.
            </p>
            <p className="mt-4 font-medium leading-relaxed text-muted-foreground">
              Listings go live after a subscription. Drivers and hosters earn a trust score from
              completed trips and reviews. Every booking is protected by that system.
            </p>
          </div>
          <div>
            <h2 className="mb-4 text-2xl font-black text-foreground">Who We Are</h2>
            <p className="font-medium leading-relaxed text-muted-foreground">
              We are <strong className="text-foreground">CARIRWA LTD</strong>, a Rwanda-registered company headquartered in
              Kigali. Our team combines deep local knowledge with modern technology to build a
              marketplace that works for Rwandans and visitors alike.
            </p>
            <p className="mt-4 font-medium leading-relaxed text-muted-foreground">
              renting.rw is our flagship product — a platform that puts safety, reliability, and
              fair pricing at the center of every transaction.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-t-2 border-b-2 border-border bg-card px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-black text-foreground">What We Stand For</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <ShieldCheck className="h-8 w-8 text-brand" />,
                title: 'Trust & Safety',
                desc: 'Hosters and drivers subscribe to go live. Extra Premium is the verified badge. Our trust score keeps standards high.',
              },
              {
                icon: <Star className="h-8 w-8 text-brand" />,
                title: 'Quality First',
                desc: 'Only well-maintained vehicles and professional drivers make it onto the platform.',
              },
              {
                icon: <Car className="h-8 w-8 text-brand" />,
                title: 'Local Expertise',
                desc: 'Built by Rwandans, for Rwanda. We know the roads, the cities, the culture.',
              },
              {
                icon: <Users className="h-8 w-8 text-brand" />,
                title: 'Community',
                desc: 'We empower car owners and drivers to build sustainable income through our platform.',
              },
            ].map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="mb-3">{v.icon}</div>
                <h3 className="mb-2 font-black text-foreground">{v.title}</h3>
                <p className="text-sm font-medium text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Car illustration banner */}
      <section className="border-b-2 border-border bg-brand-soft px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <IllustrationCarRental className="mx-auto w-full max-w-lg" />
        </div>
      </section>

      {/* Headquarters */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-card">
          <MapPin className="h-7 w-7 text-brand" />
        </div>
        <h2 className="mb-3 mt-5 text-2xl font-black text-foreground">Find Us</h2>
        <p className="font-medium text-muted-foreground">
          CARIRWA LTD — Kigali, Rwanda
          <br />
          <a href="tel:+250788781648" className="font-black text-brand hover:underline">
            0788 781 648
          </a>
          {' · '}
          <a href="mailto:renting.rw@gmail.com" className="font-black text-brand hover:underline">
            renting.rw@gmail.com
          </a>
        </p>
      </section>

      <div className="flex-1" />
      <SiteFooter locale={locale} />
    </main>
  );
}
