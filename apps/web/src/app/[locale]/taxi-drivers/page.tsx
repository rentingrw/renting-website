'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { Car, MapPin, Phone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type TaxiDriversPageProps = {
  params: Promise<{ locale: string }>;
};

type TaxiDriver = {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  seats: number;
  details?: string | null;
  photoUrl?: string | null;
  profilePhotoUrl?: string | null;
};

export default function TaxiDriversPage({ params }: TaxiDriversPageProps) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [location, setLocation] = useState('');
  const [drivers, setDrivers] = useState<TaxiDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      if (!cancelled && isSupportedLocale(routeParams.locale)) setLocale(routeParams.locale);
    }
    resolveParams();
    return () => { cancelled = true; };
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function fetchDrivers() {
      setLoading(true);
      try {
        const url = new URL(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/taxi-drivers`);
        if (location.trim()) url.searchParams.set('city', location.trim());
        const res = await fetch(url.toString());
        if (res.ok && !cancelled) {
          const data = await res.json() as TaxiDriver[];
          setDrivers(data);
        }
      } catch {
        // silently fail, show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timeout = setTimeout(() => { void fetchDrivers(); }, location.trim() ? 400 : 0);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [location]);

  const filtered = drivers;

  return (
    <main className="min-h-screen bg-[#f5f0e8]">
      <AppHeader locale={locale} variant="default" />

      {/* Hero */}
      <div className="border-b-2 border-neutral-900 bg-neutral-900 px-4 py-12 text-center">
        <div className="mx-auto max-w-2xl">
          <span className="inline-block rounded border-2 border-amber-400 bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-widest text-neutral-900">
            Taxi Drivers
          </span>
          <h1 className="mt-4 text-3xl font-black text-white md:text-4xl">Find a Taxi Driver in Rwanda</h1>
          <p className="mt-3 text-base font-medium text-neutral-400">
            Browse verified taxi drivers. Call instantly — no waiting for booking confirmation.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <div className="flex items-center gap-2 rounded border-2 border-neutral-600 bg-neutral-800 px-4 py-2.5">
              <MapPin className="h-4 w-4 text-teal-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Filter by city (Kigali, Musanze...)"
                className="flex-1 bg-transparent text-sm font-semibold text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
            <Link
              href={`/${locale}/taxi-drivers/register`}
              className="rounded border-2 border-teal-800 bg-teal-600 px-6 py-2.5 text-sm font-black text-white shadow-brutal-teal-sm transition-all hover:bg-teal-700"
            >
              Register as Taxi Driver
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-black uppercase tracking-widest text-neutral-500">
            {loading ? 'Loading...' : `${filtered.length} taxi driver${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-md border-2 border-neutral-200 bg-neutral-100" />
            ))
          ) : filtered.map((taxi) => (
            <article
              key={taxi.id}
              className="overflow-hidden rounded-md border-2 border-neutral-900 bg-white shadow-brutal"
            >
              {/* Header */}
              <div className="flex flex-col items-center border-b-2 border-neutral-900 bg-teal-50 px-6 py-6">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-neutral-900 bg-teal-600 text-2xl font-black text-white">
                  {taxi.profilePhotoUrl ? (
                    <Image src={taxi.profilePhotoUrl} alt={taxi.fullName} fill sizes="80px" className="object-cover" />
                  ) : (
                    taxi.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                <h3 className="mt-3 text-center font-black text-neutral-900">{taxi.fullName}</h3>
                <div className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
                  <MapPin className="h-3.5 w-3.5 text-teal-600" />
                  {taxi.city}
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <div className="flex items-center text-sm">
                  <div className="flex items-center gap-1 font-semibold text-neutral-700">
                    <Car className="h-4 w-4 text-teal-600" />
                    {taxi.seats} seats
                  </div>
                </div>

                {/* Call button — most important action */}
                <a
                  href={`tel:${taxi.phone.replace(/\s/g, '')}`}
                  className="flex w-full items-center justify-center gap-2 rounded border-2 border-teal-800 bg-teal-600 px-4 py-3 text-sm font-black text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-teal-700 hover:shadow-none"
                >
                  <Phone className="h-4 w-4" />
                  {taxi.phone}
                </a>
              </div>
            </article>
          ))}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <Car className="h-16 w-16 text-neutral-300" />
            <p className="mt-4 text-lg font-black text-neutral-500">No taxi drivers found in &quot;{location}&quot;</p>
            <button
              type="button"
              onClick={() => setLocation('')}
              className="mt-4 rounded border-2 border-neutral-900 px-4 py-2 text-sm font-bold text-neutral-900 hover:bg-neutral-100"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Info banner */}
        <div className="mt-12 rounded-md border-2 border-neutral-900 bg-amber-50 p-6 shadow-brutal">
          <h2 className="font-black text-neutral-900">Are you a taxi driver?</h2>
          <p className="mt-2 text-sm font-medium text-neutral-600">
            Join Renting.rw as a taxi driver and get discovered by thousands of customers across Rwanda.
            Register your taxi, set your location, and start getting calls instantly.
          </p>
          <Link
            href={`/${locale}/taxi-drivers/register`}
            className="mt-4 inline-block rounded border-2 border-neutral-900 bg-amber-400 px-5 py-2.5 text-sm font-black text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Register Your Taxi →
          </Link>
        </div>
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}
