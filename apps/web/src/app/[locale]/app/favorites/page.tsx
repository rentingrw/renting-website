'use client';

import { useAuth } from '@clerk/nextjs';
import { DashboardHeader } from '@/components/web/dashboard-header';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { getFavorites, removeFavorite, type FavoriteItem } from '@/lib/api';
import { Car, Heart, MapPin, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type FavoritesPageProps = {
  params: Promise<{ locale: string }>;
};

export default function FavoritesPage({ params }: FavoritesPageProps) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const { isSignedIn, getToken } = useAuth();

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
    async function load() {
      if (!isSignedIn) { setLoading(false); return; }
      setLoading(true);
      try {
        const token = await getToken();
        if (token && !cancelled) {
          const data = await getFavorites(token);
          if (!cancelled) setFavorites(data);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  async function handleRemove(carListingId: string) {
    const token = await getToken();
    if (!token) return;
    setRemoving(carListingId);
    try {
      await removeFavorite(token, carListingId);
      setFavorites((prev) => prev.filter((f) => f.carListing.id !== carListingId));
    } catch {
      // silently fail
    } finally {
      setRemoving(null);
    }
  }

  const activeFavorites = favorites.filter(
    (f) => f.carListing.status !== 'deleted' && f.carListing.status !== 'archived',
  );

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
        <p className="mt-1 text-sm text-neutral-500">Cars you've saved for quick access.</p>

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-md border-2 border-neutral-200 bg-neutral-100" />
            ))}
          </div>
        ) : activeFavorites.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-neutral-900 bg-neutral-100">
              <Heart className="h-12 w-12 text-neutral-300" />
            </div>
            <h2 className="mt-6 text-xl font-black text-neutral-900">No favorites yet</h2>
            <p className="mt-2 max-w-sm text-sm font-medium text-neutral-500">
              Browse cars then tap the heart icon to save them here for later.
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
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeFavorites.map((fav) => {
              const car = fav.carListing;
              const photo = car.photos?.[0];
              return (
                <article
                  key={fav.id}
                  className="overflow-hidden rounded-md border-2 border-neutral-900 bg-white shadow-brutal"
                >
                  <Link href={`/${locale}/cars/${car.id}`} className="block">
                    <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-neutral-900 bg-neutral-100">
                      {photo ? (
                        <Image src={photo} alt={car.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Car className="h-10 w-10 text-neutral-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-black text-neutral-900 leading-tight">{car.title}</h3>
                      <p className="mt-0.5 text-xs font-semibold text-neutral-500">
                        {car.year} {car.brand} {car.model}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-xs font-medium text-neutral-600">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                        {car.locationText}
                      </div>
                    </div>
                  </Link>
                  <div className="border-t-2 border-neutral-200 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500">by {car.owner.fullName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(car.id)}
                      disabled={removing === car.id}
                      className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
