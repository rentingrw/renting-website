'use client';

import { useAuth } from '@clerk/nextjs';
import { DashboardHeader } from '@/components/web/dashboard-header';
import { InitialsAvatar } from '@/components/web/initials-avatar';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  getFavorites, removeFavorite,
  getDriverFavorites, removeDriverFavorite,
  type FavoriteItem, type DriverFavoriteItem,
} from '@/lib/api';
import { Car, Heart, MapPin, Trash2, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type FavoritesPageProps = {
  params: Promise<{ locale: string }>;
};

type Tab = 'cars' | 'drivers';

export default function FavoritesPage({ params }: FavoritesPageProps) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [activeTab, setActiveTab] = useState<Tab>('cars');
  const [carFavorites, setCarFavorites] = useState<FavoriteItem[]>([]);
  const [driverFavorites, setDriverFavorites] = useState<DriverFavoriteItem[]>([]);
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
          const [cars, drivers] = await Promise.all([
            getFavorites(token).catch(() => []),
            getDriverFavorites(token).catch(() => []),
          ]);
          if (!cancelled) {
            setCarFavorites(cars);
            setDriverFavorites(drivers);
          }
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

  async function handleRemoveCar(carListingId: string) {
    const token = await getToken();
    if (!token) return;
    setRemoving(carListingId);
    try {
      await removeFavorite(token, carListingId);
      setCarFavorites((prev) => prev.filter((f) => f.carListing.id !== carListingId));
    } catch {
      // silently fail
    } finally {
      setRemoving(null);
    }
  }

  async function handleRemoveDriver(driverProfileId: string) {
    const token = await getToken();
    if (!token) return;
    setRemoving(driverProfileId);
    try {
      await removeDriverFavorite(token, driverProfileId);
      setDriverFavorites((prev) => prev.filter((f) => f.driverProfile.id !== driverProfileId));
    } catch {
      // silently fail
    } finally {
      setRemoving(null);
    }
  }

  const activeCars = carFavorites.filter(
    (f) => f.carListing.status !== 'deleted' && f.carListing.status !== 'archived',
  );

  const isEmpty = activeCars.length === 0 && driverFavorites.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        locale={locale}
        onLocaleChange={() => {}}
        notifications={[]}
        onClearNotifications={() => {}}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <h1 className="text-2xl font-black tracking-tight text-foreground">My Favorites</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cars and drivers you've saved for quick access.</p>

        {/* Tabs */}
        {!loading && !isEmpty && (
          <div className="mt-6 flex gap-2 border-b-2 border-border">
            <button
              type="button"
              onClick={() => setActiveTab('cars')}
              className={`-mb-0.5 flex items-center gap-1.5 border-b-4 px-4 py-2 text-sm font-black transition-colors ${
                activeTab === 'cars'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Car className="h-4 w-4" />
              Cars
              {activeCars.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-black text-muted-foreground">
                  {activeCars.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('drivers')}
              className={`-mb-0.5 flex items-center gap-1.5 border-b-4 px-4 py-2 text-sm font-black transition-colors ${
                activeTab === 'drivers'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-4 w-4" />
              Drivers
              {driverFavorites.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-black text-muted-foreground">
                  {driverFavorites.length}
                </span>
              )}
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-md border-2 border-border bg-muted" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-border bg-muted">
              <Heart className="h-12 w-12 text-neutral-300" />
            </div>
            <h2 className="mt-6 text-xl font-black text-foreground">No favorites yet</h2>
            <p className="mt-2 max-w-sm text-sm font-medium text-muted-foreground">
              Browse cars and drivers then tap the heart icon to save them here for later.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={`/${locale}/cars`}
                className="rounded border-2 border-border bg-card px-5 py-2.5 text-sm font-black text-foreground shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
              >
                Browse Cars
              </Link>
              <Link
                href={`/${locale}/drivers`}
                className="rounded border-2 border-border bg-card px-5 py-2.5 text-sm font-black text-foreground shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
              >
                Find Drivers
              </Link>
              <Link
                href={`/${locale}/taxi-drivers`}
                className="rounded border-2 border-brand-strong bg-brand px-5 py-2.5 text-sm font-black text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
              >
                Taxi Drivers
              </Link>
            </div>
          </div>
        ) : activeTab === 'cars' ? (
          activeCars.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center text-center">
              <Car className="h-12 w-12 text-neutral-300" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">No car favorites yet.</p>
              <Link href={`/${locale}/cars`} className="mt-4 rounded border-2 border-border bg-card px-4 py-2 text-sm font-black text-foreground shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none">
                Browse Cars
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeCars.map((fav) => {
                const car = fav.carListing;
                const photo = car.photos?.[0];
                return (
                  <article
                    key={fav.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                  >
                    <Link href={`/${locale}/cars/${car.id}`} className="block">
                      <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-border bg-muted">
                        {photo ? (
                          <Image src={photo} alt={car.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Car className="h-10 w-10 text-neutral-300" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-black text-foreground leading-tight">{car.title}</h3>
                        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                          {car.year} {car.brand} {car.model}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
                          {car.locationText}
                        </div>
                      </div>
                    </Link>
                    <div className="border-t-2 border-border px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">by {car.owner.fullName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCar(car.id)}
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
          )
        ) : (
          driverFavorites.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center text-center">
              <User className="h-12 w-12 text-neutral-300" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">No driver favorites yet.</p>
              <Link href={`/${locale}/drivers`} className="mt-4 rounded border-2 border-border bg-card px-4 py-2 text-sm font-black text-foreground shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none">
                Find Drivers
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {driverFavorites.map((fav) => {
                const dp = fav.driverProfile;
                return (
                  <article
                    key={fav.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                  >
                    <Link href={`/${locale}/drivers/${dp.id}`} className="block">
                      <div className="flex items-center gap-3 border-b-2 border-border bg-neutral-50 p-4">
                        <InitialsAvatar name={dp.user.fullName} src={dp.user.avatarUrl} size={56} />
                        <div className="min-w-0">
                          <h3 className="truncate font-black text-foreground">{dp.user.fullName}</h3>
                          <p className="text-xs font-semibold capitalize text-muted-foreground">
                            {dp.driverCategory.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="p-4 space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
                          {dp.primaryCity}
                        </div>
                        <p className="text-sm font-black text-brand">
                          {Number(dp.dailyRateRwf).toLocaleString()} RWF/day
                        </p>
                        {dp.rating && (
                          <p className="text-xs font-semibold text-muted-foreground">
                            ★ {Number(dp.rating).toFixed(1)} · {dp.completedTrips} trips
                          </p>
                        )}
                      </div>
                    </Link>
                    <div className="border-t-2 border-border px-4 py-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveDriver(dp.id)}
                        disabled={removing === dp.id}
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
          )
        )}
      </main>
    </div>
  );
}
