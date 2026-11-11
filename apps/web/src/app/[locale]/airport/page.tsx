'use client';

import { AppHeader } from '@/components/web/app-header';
import { MarketingPageHero } from '@/components/web/marketing-page-hero';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { SITE_PHONE_DISPLAY, SITE_WHATSAPP_URL } from '@/lib/site-contact';
import { Car, MapPin, Plane, PlaneLanding, PlaneTakeoff, RotateCcw, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const SERVICES = [
  {
    icon: PlaneLanding,
    title: 'Airport pickup',
    body: 'A driver meets you when you land and takes you to your hotel, home, office, or the next stop on your trip.',
  },
  {
    icon: PlaneTakeoff,
    title: 'Airport drop-off',
    body: 'We drive you to the airport in time for your flight, including early departures and late check-ins.',
  },
  {
    icon: Car,
    title: 'Car brought to you at the airport',
    body: 'When you rent a car, the owner can deliver it to you at the airport. You start driving from arrivals instead of going to their place first.',
  },
  {
    icon: UserRound,
    title: 'A driver brings the car',
    body: 'Ask for a driver to bring the car to the airport and drive you. You do not have to collect the car from the owner yourself.',
  },
  {
    icon: RotateCcw,
    title: 'Return the car to their place',
    body: 'When the rental ends, a driver can meet you — including at the airport — and take the car back to the owner. You can fly out without driving it back.',
  },
  {
    icon: MapPin,
    title: 'Anywhere you agree',
    body: 'Pickup and return are not limited to the airport. The same delivery can be at your hotel, home, or another meeting point you set with the host.',
  },
] as const;

export default function AirportPage({ params }: { params: Promise<{ locale: string }> }) {
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
        align="center"
        eyebrow="Airport"
        title="Airport transfers"
        subtitle="We offer airport pickup and drop-off. Rent a car and we can bring it to you at the airport, send a driver with it, or have it returned to the owner when you leave."
      />
      <section className="border-b border-border bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/${locale}/cars`}
              className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Browse cars
            </Link>
            <Link
              href={`/${locale}/drivers`}
              className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Find a driver
            </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="detail-panel p-5">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="text-base font-black text-foreground">{title}</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-black text-foreground">How airport service works</h2>
        <ol className="mt-5 space-y-4">
          {[
            'Choose a car or a driver and send a booking request. In the note, say you need an airport pickup, drop-off, car delivery, or a return to the owner.',
            'Include your flight time, how many people and bags, and where the car should be delivered or collected.',
            'We confirm the booking with the host, then share their name and phone so you can agree the exact meeting point.',
            'At the airport, the host or driver meets you, hands over the car, drives you, or takes the car back to their place.',
          ].map((step, index) => (
            <li key={step} className="flex gap-3 text-sm font-medium leading-relaxed text-muted-foreground">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-black text-white">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-black text-foreground">What to tell us</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-medium leading-relaxed text-muted-foreground">
            <li>Arrival or departure time, and the airport (usually Kigali International Airport).</li>
            <li>Whether you want only a transfer, a self-drive car delivered to you, or a driver for the trip.</li>
            <li>Where the car should go back: the owner&apos;s place, the airport, or another address.</li>
            <li>Passengers, luggage, and a phone number we can reach on the day.</li>
          </ul>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            The rental price is the rate on the listing. Airport delivery and a driver are arranged with the host
            when the booking is confirmed.
          </p>
          <a
            href={SITE_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            WhatsApp {SITE_PHONE_DISPLAY}
          </a>
        </div>
      </section>

      <div className="flex-1" />
      <SiteFooter locale={locale} />
    </main>
  );
}
