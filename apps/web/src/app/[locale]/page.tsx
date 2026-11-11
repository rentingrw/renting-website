'use client';

import { AppHeader } from '@/components/web/app-header';
import { useFavoriteIds } from '@/components/web/favorite-button';
import { CarListingCard } from '@/components/web/car-listing-card';
import { DriverListingCard } from '@/components/web/driver-listing-card';
import { TaxiListingCard } from '@/components/web/taxi-listing-card';
import { MarketplaceSearchBar } from '@/components/web/marketplace-search-bar';
import { SectionHeading } from '@/components/web/section-heading';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { searchMarketplace, type SearchCar, type SearchDriver, type SearchTaxi } from '@/lib/api';
import { Car, Home, Plane, Truck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

const POPULAR_PLACES = ['Kigali', 'Musanze', 'Rubavu', 'Huye', 'Karongi'] as const;
const HOME_SECTION_LIMIT = 8;

type PopularListingKind = 'all' | 'cars' | 'drivers' | 'taxi';

function cityHrefForListing(locale: SupportedLocale, kind: PopularListingKind, city: string): string {
  const q = encodeURIComponent(city);
  switch (kind) {
    case 'cars':
      return `/${locale}/cars?location=${q}`;
    case 'drivers':
      return `/${locale}/drivers?location=${q}`;
    case 'taxi':
      return `/${locale}/taxi-drivers?location=${q}`;
    default:
      return `/${locale}/search?location=${q}`;
  }
}

export default function HomePage({ params }: HomePageProps) {
  const t = useTranslations('web');
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [featuredCars, setFeaturedCars] = useState<SearchCar[]>([]);
  const [featuredDrivers, setFeaturedDrivers] = useState<SearchDriver[]>([]);
  const [featuredTaxis, setFeaturedTaxis] = useState<SearchTaxi[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [popularListing, setPopularListing] = useState<PopularListingKind>('all');
  const carFavorites = useFavoriteIds('car');
  const driverFavorites = useFavoriteIds('driver');

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      if (!cancelled && isSupportedLocale(routeParams.locale)) setLocale(routeParams.locale);
    }
    resolveParams();
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    let cancelled = false;

    async function loadFeatured() {
      try {
        const data = await searchMarketplace({ type: 'all', limit: HOME_SECTION_LIMIT });
        if (!cancelled) {
          setFeaturedCars(data.cars.slice(0, HOME_SECTION_LIMIT));
          setFeaturedDrivers(data.drivers.slice(0, HOME_SECTION_LIMIT));
          setFeaturedTaxis((data.taxis ?? []).slice(0, HOME_SECTION_LIMIT));
        }
      } catch {
        if (!cancelled) {
          setFeaturedCars([]);
          setFeaturedDrivers([]);
          setFeaturedTaxis([]);
        }
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    }
    loadFeatured();
    return () => {
      cancelled = true;
    };
  }, []);

  const searchHref = useMemo(() => {
    const paramsObj = new URLSearchParams();
    if (location.trim()) paramsObj.set('location', location.trim());
    if (latitude !== null) paramsObj.set('latitude', String(latitude));
    if (longitude !== null) paramsObj.set('longitude', String(longitude));
    if (from) paramsObj.set('from', from);
    if (to) paramsObj.set('to', to);
    return `/${locale}/search?${paramsObj.toString()}`;
  }, [from, latitude, locale, location, longitude, to]);

  const browse = [
    { href: `/${locale}/cars`, label: t('nav.cars'), icon: Car, kind: 'cars' as const },
    { href: `/${locale}/drivers`, label: t('nav.drivers'), icon: UserRound, kind: 'drivers' as const },
    { href: `/${locale}/taxi-drivers`, label: t('nav.taxi'), icon: Truck, kind: 'taxi' as const },
    { href: `/${locale}/airport`, label: t('nav.airport'), icon: Plane, kind: null },
  ];

  const supply = [
    { href: `/${locale}/list-your-car`, label: t('nav.becomeHoster'), icon: Home },
    { href: `/${locale}/drive-with-us`, label: t('nav.becomeDriver'), icon: Car },
    { href: `/${locale}/onboard/taxi`, label: t('nav.becomeTaxi'), icon: Truck },
  ];

  const popularListingTabs: { id: PopularListingKind; label: string }[] = [
    { id: 'all', label: t('tabs.all') },
    { id: 'cars', label: t('tabs.cars') },
    { id: 'drivers', label: t('tabs.drivers') },
    { id: 'taxi', label: t('tabs.taxi') },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader locale={locale} variant="default" />

      <section className="home-hero relative overflow-hidden text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(212, 160, 23, 0.14), transparent 55%), linear-gradient(160deg, #14221f 0%, #1b3530 50%, #14221f 100%)',
          }}
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-11 sm:px-6 sm:pb-14 sm:pt-14">
          <p className="text-sm font-medium text-white/65">{t('home.heroKicker')}</p>
          <h1 className="hero-title mt-2 max-w-2xl text-white">{t('home.heroTitle')}</h1>

          <div className="relative z-10 mt-7 mb-[-2.75rem]">
            <MarketplaceSearchBar
              location={location}
              from={from}
              to={to}
              searchHref={searchHref}
              onLocationChange={(value) => {
                setLocation(value);
                setLatitude(null);
                setLongitude(null);
              }}
              onPlaceSelected={(place) => {
                setLocation(place.address);
                setLatitude(place.latitude);
                setLongitude(place.longitude);
              }}
              onFromChange={setFrom}
              onToChange={setTo}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-10 pt-[4.5rem] sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft-sm sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {browse.map(({ href, label, icon: Icon, kind }) => (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  if (kind) setPopularListing(kind);
                }}
                className="group flex flex-col items-center gap-2 rounded-xl bg-secondary/60 px-3 py-4 text-center transition hover:bg-brand-soft hover:text-brand"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-card text-brand shadow-soft-sm transition group-hover:scale-105">
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <span className="text-sm font-bold text-foreground group-hover:text-brand">{label}</span>
              </Link>
            ))}
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">{t('home.popularPlaces')}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex flex-wrap gap-1.5">
                {popularListingTabs.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPopularListing(id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      popularListing === id
                        ? 'bg-ink text-white'
                        : 'bg-secondary text-foreground hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:ml-1">
                {POPULAR_PLACES.map((city) => (
                  <Link
                    key={city}
                    href={cityHrefForListing(locale, popularListing, city)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-brand hover:text-brand"
                  >
                    {city}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {(featuredLoading || featuredCars.length > 0) && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">
          <SectionHeading
            title={t('nav.cars')}
            href={`/${locale}/cars`}
            actionLabel={t('home.viewAll')}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredLoading && featuredCars.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="aspect-[4/3] bg-muted" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                  </div>
                ))
              : featuredCars.map((car) => (
                  <CarListingCard
                    key={car.id}
                    car={car}
                    locale={locale}
                    favorited={carFavorites.ids.has(car.id)}
                    onFavoriteChange={(next) => carFavorites.setFavorited(car.id, next)}
                  />
                ))}
          </div>
        </section>
      )}

      {(featuredLoading || featuredDrivers.length > 0) && (
        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
            <SectionHeading
              title={t('nav.drivers')}
              href={`/${locale}/drivers`}
              actionLabel={t('home.viewAll')}
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredLoading && featuredDrivers.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-5">
                      <div className="mx-auto h-20 w-20 rounded-full bg-muted" />
                      <div className="mx-auto mt-4 h-4 w-3/4 rounded bg-muted" />
                    </div>
                  ))
                : featuredDrivers.map((driver) => (
                    <DriverListingCard
                      key={driver.id}
                      driver={driver}
                      locale={locale}
                      favorited={driverFavorites.ids.has(driver.id)}
                      onFavoriteChange={(next) => driverFavorites.setFavorited(driver.id, next)}
                    />
                  ))}
            </div>
          </div>
        </section>
      )}

      {(featuredLoading || featuredTaxis.length > 0) && (
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
          <SectionHeading
            title={t('nav.taxi')}
            href={`/${locale}/taxi-drivers`}
            actionLabel={t('home.viewAll')}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredLoading && featuredTaxis.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-5">
                    <div className="mx-auto h-20 w-20 rounded-full bg-muted" />
                    <div className="mx-auto mt-4 h-4 w-3/4 rounded bg-muted" />
                  </div>
                ))
              : featuredTaxis.map((taxi) => (
                  <TaxiListingCard key={taxi.id} taxi={taxi} locale={locale} />
                ))}
          </div>
        </section>
      )}

      <section className="border-t border-border bg-card py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 sm:px-6">
          <p className="text-sm font-semibold text-muted-foreground">{t('home.listWithUs')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {supply.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-bold text-foreground transition hover:border-brand hover:bg-brand-soft hover:text-brand"
              >
                <item.icon className="h-4 w-4 text-brand" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
