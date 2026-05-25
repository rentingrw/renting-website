'use client';

import { DashboardHeader } from '@/components/web/dashboard-header';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type FavoritesPageProps = {
  params: Promise<{ locale: string }>;
};

export default function FavoritesPage({ params }: FavoritesPageProps) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      if (!cancelled && isSupportedLocale(routeParams.locale)) setLocale(routeParams.locale);
    }
    resolveParams();
    return () => { cancelled = true; };
  }, [params]);

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <DashboardHeader
        locale={locale}
        onLocaleChange={() => {}}
        notifications={[]}
        onClearNotifications={() => {}}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">My Favorites</h1>
        <p className="mt-1 text-sm text-neutral-500">Save cars, drivers, and taxi drivers you love for quick access.</p>

        {/* Empty state */}
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-neutral-900 bg-neutral-100">
            <Heart className="h-12 w-12 text-neutral-300" />
          </div>
          <h2 className="mt-6 text-xl font-black text-neutral-900">No favorites yet</h2>
          <p className="mt-2 max-w-sm text-sm font-medium text-neutral-500">
            Browse cars, drivers, and taxi drivers then tap the heart icon to save them here for later.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`/${locale}/cars`}
              className="rounded border-2 border-neutral-900 bg-white px-5 py-2.5 text-sm font-black text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
            >
              Browse Cars
            </Link>
            <Link
              href={`/${locale}/drivers`}
              className="rounded border-2 border-neutral-900 bg-white px-5 py-2.5 text-sm font-black text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
            >
              Find Drivers
            </Link>
            <Link
              href={`/${locale}/taxi-drivers`}
              className="rounded border-2 border-teal-800 bg-teal-600 px-5 py-2.5 text-sm font-black text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
            >
              Taxi Drivers
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
