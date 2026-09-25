'use client';

import { useAuth } from '@clerk/nextjs';
import { AppHeader } from '@/components/web/app-header';
import { useFavoriteIds } from '@/components/web/favorite-button';
import { CarListingCard } from '@/components/web/car-listing-card';
import { DriverListingCard } from '@/components/web/driver-listing-card';
import { MarketplaceSearchBar } from '@/components/web/marketplace-search-bar';
import { SectionHeading } from '@/components/web/section-heading';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { searchMarketplace, type SearchCar, type SearchDriver } from '@/lib/api';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BedDouble,
  Car,
  Home,
  ShieldCheck,
  Truck,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

const POPULAR_PLACES = ['Kigali', 'Musanze', 'Rubavu', 'Huye', 'Karongi'] as const;
const KIGALI = { latitude: -1.9536, longitude: 30.0606 };

export default function HomePage({ params }: HomePageProps) {
  const t = useTranslations('web');
  const { getToken, isSignedIn } = useAuth();
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [featuredCars, setFeaturedCars] = useState<SearchCar[]>([]);
  const [featuredDrivers, setFeaturedDrivers] = useState<SearchDriver[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const carFavorites = useFavoriteIds('car');
  const driverFavorites = useFavoriteIds('driver');

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
    async function loadFeatured() {
      const token = isSignedIn ? await getToken() : null;
      const auth = token ?? undefined;
      try {
        const [carsRes, driversRes] = await Promise.all([
          searchMarketplace({ type: 'cars', location: 'Kigali', limit: 4 }, auth).catch(() =>
            searchMarketplace({ type: 'cars', ...KIGALI, limit: 4 }, auth),
          ),
          searchMarketplace({ type: 'drivers', location: 'Kigali', limit: 4 }, auth).catch(() =>
            searchMarketplace({ type: 'drivers', ...KIGALI, limit: 4 }, auth),
          ),
        ]);
        if (!cancelled) {
          setFeaturedCars(carsRes.cars.slice(0, 4));
          setFeaturedDrivers(driversRes.drivers.slice(0, 4));
        }
      } catch {
        if (!cancelled) {
          setFeaturedCars([]);
          setFeaturedDrivers([]);
        }
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    }
    loadFeatured();
    return () => { cancelled = true; };
  }, [getToken, isSignedIn]);

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
    { href: `/${locale}/cars`, label: t('nav.cars'), icon: Car },
    { href: `/${locale}/drivers`, label: t('nav.drivers'), icon: UserRound },
    { href: `/${locale}/taxi-drivers`, label: t('nav.taxi'), icon: Truck },
    { href: `/${locale}/stays`, label: t('nav.stays'), icon: BedDouble },
  ];

  const steps = [
    { n: '1', title: t('home.howSearchTitle') },
    { n: '2', title: t('home.howChooseTitle') },
    { n: '3', title: t('home.howBookTitle') },
  ];

  const supply = [
    { href: `/${locale}/list-your-car`, label: t('nav.becomeHoster'), icon: Home },
    { href: `/${locale}/drive-with-us`, label: t('nav.becomeDriver'), icon: Car },
    { href: `/${locale}/onboard/taxi`, label: t('nav.becomeTaxi'), icon: Truck },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader locale={locale} variant="default" />

      <section className="bg-ink text-white">
        <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16">
          <h1 className="hero-title max-w-3xl font-extrabold tracking-tight text-white">
            {t('home.heroTitle')}
          </h1>

          <div className="relative z-10 mt-8 mb-[-3.25rem]">
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

      <section className="mx-auto w-full max-w-7xl px-4 pb-14 pt-20 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {POPULAR_PLACES.map((city) => (
            <Link
              key={city}
              href={`/${locale}/search?location=${encodeURIComponent(city)}`}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-bold text-foreground transition hover:border-brand hover:text-brand"
            >
              {city}
            </Link>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {browse.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft-sm transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <p className="font-bold text-foreground">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6">
        <SectionHeading
          title={t('nav.cars')}
          href={`/${locale}/cars`}
          actionLabel={t('home.viewAll')}
        />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
            : featuredCars.length > 0
              ? featuredCars.map((car) => (
                  <CarListingCard
                    key={car.id}
                    car={car}
                    locale={locale}
                    favorited={carFavorites.ids.has(car.id)}
                    onFavoriteChange={(next) => carFavorites.setFavorited(car.id, next)}
                  />
                ))
              : (
                    <EmptyFeatured
                      message={t('home.emptyFeaturedCars')}
                      href={`/${locale}/cars`}
                      action={t('home.viewAll')}
                    />
                )}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeading
            title={t('nav.drivers')}
            href={`/${locale}/drivers`}
            actionLabel={t('home.viewAll')}
          />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredLoading && featuredDrivers.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-5">
                    <div className="mx-auto h-24 w-24 rounded-full bg-muted" />
                    <div className="mx-auto mt-4 h-4 w-3/4 rounded bg-muted" />
                  </div>
                ))
              : featuredDrivers.length > 0
                ? featuredDrivers.map((driver) => (
                    <DriverListingCard
                      key={driver.id}
                      driver={driver}
                      locale={locale}
                      favorited={driverFavorites.ids.has(driver.id)}
                      onFavoriteChange={(next) => driverFavorites.setFavorited(driver.id, next)}
                    />
                  ))
                : (
                    <EmptyFeatured
                      message={t('home.emptyFeaturedDrivers')}
                      href={`/${locale}/drivers`}
                      action={t('home.viewAll')}
                    />
                  )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading title={t('home.howTitle')} />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                {step.n}
              </span>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: t('home.featureCertified') },
            { icon: BadgeCheck, title: t('home.featureOnTime') },
            { icon: Banknote, title: t('home.featureTopRated') },
          ].map(({ icon: Icon, title }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                <Icon className="h-5 w-5 text-brand" />
              </div>
              <h3 className="font-semibold text-foreground">{title}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading title={t('home.supplyTitle')} />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {supply.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-brand/30 hover:shadow-card"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <item.icon className="h-5 w-5" />
              </span>
              <p className="flex-1 font-semibold text-foreground">{item.label}</p>
              <ArrowRight className="h-4 w-4 text-brand transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}

function EmptyFeatured({
  message,
  href,
  action,
}: {
  message: string;
  href: string;
  action: string;
}) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-border bg-background px-5 py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link href={href} className="mt-2 inline-block text-sm font-semibold text-brand hover:underline">
        {action} →
      </Link>
    </div>
  );
}
