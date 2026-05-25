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
  BedDouble,
  CalendarDays,
  Car,
  MapPin,
  ShieldCheck,
  Star,
  Truck,
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
  const [location, setLocation] = useState('Rwanda');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [featuredCars, setFeaturedCars] = useState<SearchCar[]>([]);
  const [featuredDrivers, setFeaturedDrivers] = useState<SearchDriver[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

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
      } catch { /* Geocoding may fail */ }
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
        if (!cancelled) { setFeaturedCars([]); setFeaturedDrivers([]); }
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

  function handleNearbyClick() {
    setNearbyLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearbyLoading(false);
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocation('My Location');
        window.location.href = `/${locale}/search?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&type=all`;
      },
      () => {
        setNearbyLoading(false);
        alert('Unable to get your location. Please check your browser permissions.');
      },
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />

      {/* Hero */}
      <section className="relative min-h-[500px]">
        <div className="absolute inset-0">
          <Image src={stockImages.heroCar} alt="" fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pt-20 pb-14">
          <h1 className="text-center text-4xl font-black tracking-tight text-white md:text-5xl">
            {t('home.premiumTitle')}{' '}
            <span className="text-teal-400">{t('home.premiumHighlight')}</span> Rwanda
          </h1>
          <p className="mt-3 max-w-xl text-center text-lg font-medium text-white/90">
            {t('home.heroSubtitle')}
          </p>

          {/* Search bar */}
          <div className="mt-10 w-full max-w-4xl">
            <div className="flex flex-col overflow-hidden rounded-md border-2 border-neutral-900 bg-white shadow-brutal sm:flex-row">
              <div className="flex flex-1 flex-col sm:flex-row sm:divide-x-2 sm:divide-neutral-200">
                <label className="flex flex-1 flex-col px-4 py-3 sm:py-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    {t('home.pickupLocation')}
                  </span>
                  <AddressInput
                    value={location}
                    onChange={(v) => { setLocation(v); setLatitude(null); setLongitude(null); }}
                    onPlaceSelected={(p) => { setLocation(p.address); setLatitude(p.latitude); setLongitude(p.longitude); }}
                    placeholder={t('search.locationPlaceholder')}
                    className="mt-1.5 border-0 bg-transparent p-0 text-base font-semibold text-neutral-900 placeholder:text-neutral-400 focus:ring-0"
                    showLocateMe
                  />
                </label>
                <label className="flex flex-1 flex-col px-4 py-3 sm:py-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    {t('home.pickupDate')}
                  </span>
                  <div className="relative mt-1.5 flex items-center">
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="min-h-[1.5rem] flex-1 border-0 bg-transparent p-0 text-base font-semibold text-neutral-900 focus:ring-0 [color-scheme:light]"
                    />
                    <CalendarDays className="absolute right-0 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                  </div>
                </label>
                <label className="flex flex-1 flex-col px-4 py-3 sm:py-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    {t('home.returnDate')}
                  </span>
                  <div className="relative mt-1.5 flex items-center">
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="min-h-[1.5rem] flex-1 border-0 bg-transparent p-0 text-base font-semibold text-neutral-900 focus:ring-0 [color-scheme:light]"
                    />
                    <CalendarDays className="absolute right-0 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                  </div>
                </label>
              </div>
              <Link
                href={searchHref}
                className="flex items-center justify-center gap-2 border-t-2 border-neutral-900 bg-teal-600 px-8 py-4 font-black text-white transition-colors hover:bg-teal-700 sm:border-t-0 sm:border-l-2"
              >
                {t('home.search')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Category tabs */}
      <div className="border-b-2 border-neutral-900 bg-white">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3">
          {[
            { href: `/${locale}/search?type=all`, label: t('home.all'), icon: Car, active: false },
            { href: `/${locale}/cars`, label: t('nav.cars'), icon: Car, active: false },
            { href: `/${locale}/stays`, label: t('nav.stays'), icon: BedDouble, active: false },
            { href: `/${locale}/drivers`, label: t('nav.drivers'), icon: UserRound, active: false },
            { href: `/${locale}/taxi-drivers`, label: t('nav.taxi'), icon: Truck, active: false },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-900 hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleNearbyClick}
            disabled={nearbyLoading}
            className="flex shrink-0 items-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-900 hover:text-white disabled:opacity-60"
          >
            <MapPin className="h-4 w-4" />
            {nearbyLoading ? 'Locating...' : t('home.nearby')}
          </button>
        </div>
      </div>

      {/* Featured cars */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight text-neutral-900">
            {t('home.featuredTitle')} {t('home.featuredVehicles')}
          </h2>
          <Link
            href={`/${locale}/cars`}
            className="rounded border-2 border-neutral-900 px-3 py-1.5 text-sm font-bold text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            {t('home.viewAllVehicles')} →
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featuredCars.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-md border-2 border-neutral-900 bg-white shadow-brutal overflow-hidden">
                  <div className="aspect-[4/3] bg-neutral-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-neutral-200" />
                    <div className="h-3 w-1/2 rounded bg-neutral-200" />
                    <div className="h-5 w-24 rounded bg-neutral-200" />
                  </div>
                </div>
              ))
            : featuredCars.map((car) => (
                <Link key={car.id} href={`/${locale}/cars/${car.id}`}>
                  <article className="group overflow-hidden rounded-md border-2 border-neutral-900 bg-white shadow-brutal transition-all hover:translate-x-px hover:translate-y-px hover:shadow-brutal-sm">
                    <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                      <Image
                        src={car.photos?.[0] ?? stockImages.cars[car.vehicleType as keyof typeof stockImages.cars] ?? stockImages.carPlaceholder}
                        alt={car.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition group-hover:scale-105"
                      />
                      <span className="absolute left-2 top-2 rounded border-2 border-neutral-900 bg-white px-2 py-0.5 text-xs font-black uppercase text-neutral-900">
                        {car.vehicleType}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-neutral-900">{car.title}</h3>
                      <div className="mt-1 text-xs font-medium text-neutral-500">
                        {car.vehicleType.replace('_', ' ')} · {car.locationText}
                      </div>
                      <div className="mt-3 font-black text-teal-700">
                        {car.dailyRateKigaliRwf
                          ? formatCurrencyRwf(car.dailyRateKigaliRwf)
                          : car.approximateDailyRateRangeRwf
                            ? formatRange(car.approximateDailyRateRangeRwf.kigali.min, car.approximateDailyRateRangeRwf.kigali.max)
                            : t('home.priceUnavailable')}
                        <span className="text-sm font-normal text-neutral-500">/{t('home.day')}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
        </div>
      </section>

      {/* Featured drivers */}
      <section className="border-t-2 border-neutral-900 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-12">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900">
              {t('home.featuredTitle')} {t('home.featuredDrivers')}
            </h2>
            <Link
              href={`/${locale}/drivers`}
              className="rounded border-2 border-neutral-900 px-3 py-1.5 text-sm font-bold text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
            >
              {t('home.viewAllDrivers')} →
            </Link>
          </div>
          <p className="mt-1 font-medium text-neutral-500">{t('home.driversSubtitle')}</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredDrivers.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-md border-2 border-neutral-900 bg-white shadow-brutal p-5">
                    <div className="mx-auto h-24 w-24 rounded-full bg-neutral-200" />
                    <div className="mt-4 space-y-2">
                      <div className="h-4 w-3/4 mx-auto rounded bg-neutral-200" />
                      <div className="h-3 w-1/2 mx-auto rounded bg-neutral-200" />
                    </div>
                  </div>
                ))
              : featuredDrivers.map((driver) => (
                  <Link key={driver.id} href={`/${locale}/drivers/${driver.id}`}>
                    <article className="group overflow-hidden rounded-md border-2 border-neutral-900 bg-white shadow-brutal transition-all hover:translate-x-px hover:translate-y-px hover:shadow-brutal-sm">
                      <div className="flex justify-center border-b-2 border-neutral-900 bg-teal-50 px-6 pt-8 pb-4">
                        <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-neutral-900 shadow-brutal-xs transition group-hover:scale-105">
                          {driver.profilePhotoUrl ? (
                            <Image src={driver.profilePhotoUrl} alt={driver.fullName} fill sizes="96px" className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-neutral-100">
                              <UserRound className="h-12 w-12 text-neutral-400" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-neutral-900">{driver.fullName}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                          <span className="flex items-center gap-0.5 font-semibold">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            {(driver.rating ?? 0).toFixed(1)}
                          </span>
                          <span>·</span>
                          <span>{driver.primaryCity}</span>
                        </div>
                        {(driver.categories?.length || driver.driverCategory) && (
                          <p className="mt-1 line-clamp-1 text-xs font-medium text-neutral-500">
                            {(driver.categories?.slice(0, 2).map((c) => c.replace('_', ' ')).join(', ') ||
                              driver.driverCategory?.replace('_', ' ')) ?? ''}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded border-2 border-teal-600 bg-teal-50 px-2 py-0.5 text-xs font-black text-teal-700">
                            {trustTierFromScore(driver.trustScore)}
                          </span>
                          <span className="font-black text-teal-700">
                            {driver.dailyRateRwf
                              ? formatCurrencyRwf(driver.dailyRateRwf)
                              : driver.approximateRateRangeRwf
                                ? formatRange(driver.approximateRateRangeRwf.daily.min, driver.approximateRateRangeRwf.daily.max)
                                : t('home.priceUnavailable')}
                            <span className="text-sm font-normal text-neutral-500">/{t('home.day')}</span>
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* How it works strip */}
      <section className="border-t-2 border-b-2 border-neutral-900 bg-teal-600">
        <div className="mx-auto flex max-w-4xl items-center justify-around gap-4 px-4 py-10">
          {[
            { illustration: <IllustrationSearch className="h-24 w-24" />, label: 'Search' },
            { illustration: <IllustrationCarRental className="h-24 w-32" />, label: 'Choose' },
            { illustration: <IllustrationDriver className="h-24 w-20" />, label: 'Go' },
          ].map(({ illustration, label }, i) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              {illustration}
              <span className="text-xs font-black uppercase tracking-widest text-white">{label}</span>
              {i < 2 && <div className="hidden h-0.5 w-12 bg-white/40 sm:block" />}
            </div>
          ))}
        </div>
      </section>

      {/* Trust badges */}
      <section className="bg-background">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: t('home.featureCertified'), desc: t('home.featureCertifiedDesc') },
            { icon: Users, title: t('home.featureOnTime'), desc: t('home.featureOnTimeDesc') },
            { icon: Star, title: t('home.featureTopRated'), desc: t('home.featureTopRatedDesc') },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 rounded-md border-2 border-neutral-900 bg-white p-5 shadow-brutal">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border-2 border-neutral-900 bg-teal-400 shadow-brutal-xs">
                <Icon className="h-6 w-6 text-neutral-900" />
              </div>
              <div>
                <h3 className="font-black text-neutral-900">{title}</h3>
                <p className="mt-1 text-sm font-medium text-neutral-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-2 border-neutral-900 bg-background px-4 pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-md border-2 border-neutral-900 bg-neutral-900 shadow-brutal">
            <div className="flex flex-col items-center md:flex-row">
              <div className="flex-1 px-8 py-12 text-center md:text-left">
                <h2 className="text-2xl font-black text-white md:text-3xl">
                  {t('home.ctaTitle')}{' '}
                  <span className="text-teal-400">Rwanda</span>?
                </h2>
                <p className="mt-3 font-medium text-neutral-300">{t('home.ctaSubtitle')}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-4 md:justify-start">
                  <Link
                    href={searchHref}
                    className="inline-flex items-center rounded border-2 border-teal-800 bg-teal-600 px-6 py-2.5 font-black text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-teal-700 hover:shadow-none"
                  >
                    {t('home.bookRideNow')}
                  </Link>
                  <Link
                    href={`/${locale}/search`}
                    className="inline-flex items-center rounded border-2 border-neutral-600 px-6 py-2.5 font-bold text-white transition-all hover:bg-neutral-800"
                  >
                    {t('home.contactSupport')}
                  </Link>
                </div>
              </div>
              <div className="hidden md:block w-56 shrink-0 opacity-80 pr-4">
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
