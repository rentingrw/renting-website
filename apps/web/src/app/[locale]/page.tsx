'use client';

import { useAuth } from '@clerk/nextjs';
import { AddressInput } from '@/components/web/address-input';
import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { IllustrationCarRental, IllustrationDriver, IllustrationSearch } from '@/components/web/illustrations';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { searchMarketplace, type SearchCar, type SearchDriver } from '@/lib/api';
import { stockImages } from '@/lib/stock-images';
import { formatCurrencyRwf, formatRange, trustTierFromScore } from '@/lib/format';
import {
  CalendarDays,
  Car,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default function HomePage({ params }: HomePageProps) {
  const t = useTranslations('web');
  const { getToken, isSignedIn } = useAuth();
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [location, setLocation] = useState('Kigali');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [featuredCars, setFeaturedCars] = useState<SearchCar[]>([]);
  const [featuredDrivers, setFeaturedDrivers] = useState<SearchDriver[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      if (!cancelled && isSupportedLocale(routeParams.locale)) {
        setLocale(routeParams.locale);
      }
    }
    resolveParams();
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function loadFeatured() {
      const token = isSignedIn ? await getToken() : null;
      const kigaliLat = -1.9536;
      const kigaliLng = 30.0606;
      try {
        const response = await searchMarketplace(
          { type: 'all', location: 'Kigali', limit: 6 },
          token ?? undefined,
        );
        if (!cancelled && (response.cars.length > 0 || response.drivers.length > 0)) {
          setFeaturedCars(response.cars.slice(0, 4));
          setFeaturedDrivers(response.drivers.slice(0, 4));
          return;
        }
      } catch {
        // Geocoding may fail
      }
      if (cancelled) return;
      try {
        const response = await searchMarketplace(
          { type: 'all', latitude: kigaliLat, longitude: kigaliLng, limit: 6 },
          token ?? undefined,
        );
        if (!cancelled) {
          setFeaturedCars(response.cars.slice(0, 4));
          setFeaturedDrivers(response.drivers.slice(0, 4));
        }
      } catch {
        if (!cancelled) {
          setFeaturedCars([]);
          setFeaturedDrivers([]);
        }
      }
    }
    loadFeatured();
    return () => {
      cancelled = true;
    };
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

  return (
    <main className="min-h-screen bg-white">
      <AppHeader locale={locale} variant="default" />

      {/* Hero with search overlay */}
      <section className="relative min-h-[480px]">
        <div className="absolute inset-0">
          <Image
            src={stockImages.heroCar}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pt-20 pb-12">
          <h1 className="text-center text-4xl font-bold tracking-tight text-white md:text-5xl">
            {t('home.premiumTitle')}{' '}
            <span className="text-teal-300">{t('home.premiumHighlight')}</span> Kigali
          </h1>
          <p className="mt-3 max-w-xl text-center text-lg text-white/90">
            {t('home.heroSubtitle')}
          </p>

          {/* Search bar - Turo style */}
          <div className="mt-8 w-full max-w-4xl">
            <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:flex-row">
              <div className="flex flex-1 flex-col sm:flex-row sm:divide-x sm:divide-gray-200">
                <label className="flex flex-1 flex-col px-4 py-3 sm:py-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('home.pickupLocation')}
                  </span>
                  <AddressInput
                    value={location}
                    onChange={(v) => {
                      setLocation(v);
                      setLatitude(null);
                      setLongitude(null);
                    }}
                    onPlaceSelected={(p) => {
                      setLocation(p.address);
                      setLatitude(p.latitude);
                      setLongitude(p.longitude);
                    }}
                    placeholder={t('search.locationPlaceholder')}
                    className="mt-1.5 border-0 bg-transparent p-0 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:ring-0"
                  />
                </label>
                <label className="flex flex-1 flex-col px-4 py-3 sm:py-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('home.pickupDate')}
                  </span>
                  <div className="relative mt-1.5 flex items-center">
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="min-h-[1.5rem] flex-1 border-0 bg-transparent p-0 text-base font-medium text-gray-900 focus:ring-0 [color-scheme:light]"
                    />
                    <CalendarDays className="absolute right-0 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                  </div>
                </label>
                <label className="flex flex-1 flex-col px-4 py-3 sm:py-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('home.returnDate')}
                  </span>
                  <div className="relative mt-1.5 flex items-center">
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="min-h-[1.5rem] flex-1 border-0 bg-transparent p-0 text-base font-medium text-gray-900 focus:ring-0 [color-scheme:light]"
                    />
                    <CalendarDays className="absolute right-0 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                  </div>
                </label>
              </div>
              <Link
                href={searchHref}
                className="flex items-center justify-center gap-2 bg-teal-600 px-8 py-4 font-semibold text-white transition hover:bg-teal-700"
              >
                <Search className="h-5 w-5" />
                {t('home.search')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 px-4 py-3">
          <Link
            href={`/${locale}/search?type=all&location=Kigali`}
            className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            <Car className="h-4 w-4" />
            {t('home.all')}
          </Link>
          <Link
            href={`/${locale}/cars?location=Kigali`}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            <Car className="h-4 w-4" />
            {t('nav.cars')}
          </Link>
          <Link
            href={`/${locale}/drivers?location=Kigali`}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            <UserRound className="h-4 w-4" />
            {t('nav.drivers')}
          </Link>
          <Link
            href={`/${locale}/search?location=Kigali`}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            <MapPin className="h-4 w-4" />
            {t('home.nearby')}
          </Link>
        </div>
      </div>

      {/* Featured cars */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('home.featuredTitle')} {t('home.featuredVehicles')}
          </h2>
          <Link
            href={`/${locale}/cars?location=Kigali`}
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            {t('home.viewAllVehicles')}
          </Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredCars.map((car) => (
            <Link key={car.id} href={`/${locale}/cars/${car.id}`}>
              <article className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  {car.photos?.[0] ? (
                    <Image
                      src={car.photos[0]}
                      alt={car.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <Image
                      src={stockImages.cars[car.vehicleType as keyof typeof stockImages.cars] ?? stockImages.carPlaceholder}
                      alt={car.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{car.title}</h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                    <span>{car.vehicleType.replace('_', ' ')}</span>
                    <span>·</span>
                    <span>{car.locationText}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">
                      {car.dailyRateKigaliRwf
                        ? formatCurrencyRwf(car.dailyRateKigaliRwf)
                        : car.approximateDailyRateRangeRwf
                          ? formatRange(
                              car.approximateDailyRateRangeRwf.kigali.min,
                              car.approximateDailyRateRangeRwf.kigali.max,
                            )
                          : t('home.priceUnavailable')}
                      <span className="text-sm font-normal text-gray-500">/{t('home.day')}</span>
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured drivers */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-12">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {t('home.featuredTitle')} {t('home.featuredDrivers')}
            </h2>
            <Link
              href={`/${locale}/drivers?location=Kigali`}
              className="text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              {t('home.viewAllDrivers')}
            </Link>
          </div>
          <p className="mt-1 text-gray-600">{t('home.driversSubtitle')}</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredDrivers.map((driver) => (
              <Link key={driver.id} href={`/${locale}/drivers/${driver.id}`}>
                <article className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-lg hover:border-teal-200">
                  <div className="relative flex justify-center bg-gradient-to-b from-teal-50/80 to-white px-6 pt-8 pb-4">
                    <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-lg ring-2 ring-gray-100 transition group-hover:scale-105">
                      {driver.profilePhotoUrl ? (
                        <Image
                          src={driver.profilePhotoUrl}
                          alt={driver.fullName}
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100">
                          <UserRound className="h-14 w-14 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{driver.fullName}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {(driver.rating ?? 0).toFixed(1)}
                      </span>
                      <span>·</span>
                      <span>{driver.primaryCity}</span>
                    </div>
                    {(driver.categories?.length || driver.driverCategory) && (
                      <p className="mt-2 line-clamp-1 text-xs text-gray-500">
                        {(driver.categories?.slice(0, 2).map((c) => c.replace('_', ' ')).join(', ') ||
                          driver.driverCategory?.replace('_', ' ')) ?? ''}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                        {trustTierFromScore(driver.trustScore)}
                      </span>
                      <span className="font-semibold text-teal-600">
                        {driver.dailyRateRwf
                          ? formatCurrencyRwf(driver.dailyRateRwf)
                          : driver.approximateRateRangeRwf
                            ? formatRange(
                                driver.approximateRateRangeRwf.daily.min,
                                driver.approximateRateRangeRwf.daily.max,
                              )
                            : t('home.priceUnavailable')}
                        <span className="text-sm font-normal text-gray-500">/{t('home.day')}</span>
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Illustration trio */}
      <section className="bg-teal-50/50 px-4 py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-around gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <IllustrationSearch className="h-28 w-28" />
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Search</span>
          </div>
          <div className="hidden h-0.5 w-16 bg-teal-200 sm:block" />
          <div className="flex flex-col items-center gap-2 text-center">
            <IllustrationCarRental className="h-28 w-36" />
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Choose</span>
          </div>
          <div className="hidden h-0.5 w-16 bg-teal-200 sm:block" />
          <div className="flex flex-col items-center gap-2 text-center">
            <IllustrationDriver className="h-28 w-24" />
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Go</span>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 md:grid-cols-3">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50">
              <ShieldCheck className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('home.featureCertified')}</h3>
              <p className="mt-1 text-sm text-gray-600">{t('home.featureCertifiedDesc')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50">
              <Users className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('home.featureOnTime')}</h3>
              <p className="mt-1 text-sm text-gray-600">{t('home.featureOnTimeDesc')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50">
              <Star className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('home.featureTopRated')}</h3>
              <p className="mt-1 text-sm text-gray-600">{t('home.featureTopRatedDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="overflow-hidden rounded-2xl bg-gray-900">
            <div className="flex flex-col items-center md:flex-row">
              <div className="flex-1 px-8 py-12 text-center md:text-left">
                <h2 className="text-2xl font-bold text-white md:text-3xl">
                  {t('home.ctaTitle')} <span className="text-teal-400">{t('home.ctaHighlight')}</span>?
                </h2>
                <p className="mt-3 text-gray-300">{t('home.ctaSubtitle')}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-4 md:justify-start">
                  <Link href={searchHref}>
                    <span className="inline-flex items-center rounded-lg bg-teal-600 px-6 py-2.5 font-medium text-white transition hover:bg-teal-500">
                      {t('home.bookRideNow')}
                    </span>
                  </Link>
                  <Link href={`/${locale}/search?location=Kigali`}>
                    <span className="inline-flex items-center rounded-lg border border-gray-500 px-6 py-2.5 font-medium text-white transition hover:bg-gray-800">
                      {t('home.contactSupport')}
                    </span>
                  </Link>
                </div>
              </div>
              <div className="hidden md:block w-64 shrink-0 opacity-80 pr-4">
                <IllustrationCarRental className="w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
