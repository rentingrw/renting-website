'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { AddressInput } from '@/components/web/address-input';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  searchMarketplace,
  type DriverCategory,
  type SearchCar,
  type SearchDriver,
  type SearchType,
  type ServiceType,
  type VehicleType,
} from '@/lib/api';
import { formatCurrencyRwf, formatRange, trustTierFromScore } from '@/lib/format';

const SearchResultsMap = dynamic(
  () => import('@/components/web/search-results-map').then((m) => ({ default: m.SearchResultsMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[400px] items-center justify-center border-l-2 border-neutral-900 bg-neutral-100">
        <span className="text-sm font-semibold text-neutral-500">Loading map…</span>
      </div>
    ),
  },
);

type SearchPageProps = {
  params: Promise<{ locale: string }>;
};

const VEHICLE_TYPES: VehicleType[] = ['suv', 'sedan', 'hatchback', 'pickup', 'van', 'truck'];
const VEHICLE_TYPE_LABELS: Record<string, string> = { suv: 'SUV', sedan: 'Sedan', hatchback: 'Hatchback', pickup: 'Pickup', van: 'Van', truck: 'Truck' };
const DRIVER_CATEGORIES: DriverCategory[] = ['city', 'outstation', 'airport', 'chauffeur', 'tour_guide', 'delivery'];
const CATEGORY_LABELS: Record<string, string> = { city: 'City', outstation: 'Outstation', airport: 'Airport', chauffeur: 'Chauffeur', tour_guide: 'Tour Guide', delivery: 'Delivery' };
const SERVICE_TYPES: ServiceType[] = ['self_drive', 'with_driver'];
const PAGE_SIZE = 20;

function parseCoordinate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ResultSkeleton() {
  return (
    <div className="flex animate-pulse gap-3 rounded-md border-2 border-neutral-900 bg-white p-3">
      <div className="h-14 w-20 shrink-0 rounded bg-neutral-200" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-neutral-200" />
        <div className="h-3 w-1/2 rounded bg-neutral-200" />
        <div className="h-4 w-24 rounded bg-neutral-200" />
      </div>
    </div>
  );
}

export default function SearchPage({ params }: SearchPageProps) {
  const t = useTranslations('web');
  const searchParams = useSearchParams();
  const initialLatitude = parseCoordinate(searchParams.get('latitude'));
  const initialLongitude = parseCoordinate(searchParams.get('longitude'));
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [type, setType] = useState<SearchType>((searchParams.get('type') as SearchType) ?? 'all');
  const [location, setLocation] = useState(searchParams.get('location') ?? 'Kigali');
  const [latitude, setLatitude] = useState<number | null>(initialLatitude);
  const [longitude, setLongitude] = useState<number | null>(initialLongitude);
  const [from, setFrom] = useState(searchParams.get('from') ?? '');
  const [to, setTo] = useState(searchParams.get('to') ?? '');
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [driverCategory, setDriverCategory] = useState<DriverCategory | ''>('');
  const [cars, setCars] = useState<SearchCar[]>([]);
  const [drivers, setDrivers] = useState<SearchDriver[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMoreCars, setHasMoreCars] = useState(false);
  const [hasMoreDrivers, setHasMoreDrivers] = useState(false);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    async function runSearch() {
      setLoading(true);
      setError(null);
      setOffset(0);
      try {
        const data = await searchMarketplace({
          type, location,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          from: from || undefined,
          to: to || undefined,
          serviceType: serviceType || undefined,
          vehicleType: vehicleType || undefined,
          driverCategory: driverCategory || undefined,
          limit: PAGE_SIZE, offset: 0,
        });
        if (!cancelled) {
          setCars(data.cars);
          setDrivers(data.drivers);
          setHasMoreCars(Boolean(data.pagination?.hasMoreCars));
          setHasMoreDrivers(Boolean(data.pagination?.hasMoreDrivers));
          setActivePin(data.cars[0]?.id ?? data.drivers[0]?.id ?? null);
        }
      } catch (searchError) {
        if (!cancelled) setError(searchError instanceof Error ? searchError.message : t('search.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    runSearch();
    return () => { cancelled = true; };
  }, [driverCategory, from, latitude, location, longitude, serviceType, t, to, type, vehicleType]);

  async function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await searchMarketplace({
        type, location,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        from: from || undefined,
        to: to || undefined,
        serviceType: serviceType || undefined,
        vehicleType: vehicleType || undefined,
        driverCategory: driverCategory || undefined,
        limit: PAGE_SIZE, offset: nextOffset,
      });
      setCars((prev) => [...prev, ...data.cars]);
      setDrivers((prev) => [...prev, ...data.drivers]);
      setOffset(nextOffset);
      setHasMoreCars(Boolean(data.pagination?.hasMoreCars));
      setHasMoreDrivers(Boolean(data.pagination?.hasMoreDrivers));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : t('search.error'));
    } finally {
      setLoadingMore(false);
    }
  }

  const mergedResults = useMemo(() => {
    const includeCars = type === 'all' || type === 'cars';
    const includeDrivers = type === 'all' || type === 'drivers';
    return [
      ...(includeCars ? cars.map((car) => {
        const priceLabel = car.dailyRateKigaliRwf
          ? formatCurrencyRwf(car.dailyRateKigaliRwf) + '/day'
          : car.approximateDailyRateRangeRwf
            ? formatRange(car.approximateDailyRateRangeRwf.kigali.min, car.approximateDailyRateRangeRwf.kigali.max) + '/day'
            : null;
        return {
          id: car.id, label: car.title, address: car.locationText, photo: car.photos?.[0] ?? null,
          priceLabel, href: `/${locale}/cars/${car.id}`, kind: 'car' as const,
          description: [car.vehicleType, car.serviceType.replace('_', ' ')].filter(Boolean).join(' • '),
          latitude: car.pickupLatitude, longitude: car.pickupLongitude,
        };
      }) : []),
      ...(includeDrivers ? drivers.map((driver) => {
        const priceLabel = driver.dailyRateRwf
          ? formatCurrencyRwf(driver.dailyRateRwf) + '/day'
          : driver.approximateRateRangeRwf
            ? formatRange(driver.approximateRateRangeRwf.daily.min, driver.approximateRateRangeRwf.daily.max) + '/day'
            : null;
        return {
          id: driver.id, label: driver.fullName, address: driver.primaryCity, photo: driver.profilePhotoUrl ?? null,
          priceLabel, href: `/${locale}/drivers/${driver.id}`, kind: 'driver' as const,
          description: driver.categories.slice(0, 2).join(' • '),
          latitude: driver.primaryCityLatitude, longitude: driver.primaryCityLongitude,
        };
      }) : []),
    ];
  }, [cars, drivers, locale, type]);

  const tabs: { value: SearchType; label: string }[] = [
    { value: 'all', label: t('tabs.all') },
    { value: 'cars', label: t('tabs.cars') },
    { value: 'drivers', label: t('tabs.drivers') },
  ];

  const extraTabs = [
    { href: `/${locale}/stays`, label: t('tabs.stays') },
    { href: `/${locale}/taxi-drivers`, label: t('tabs.taxi') },
  ];

  const hasMore = type === 'all' ? hasMoreCars || hasMoreDrivers : type === 'cars' ? hasMoreCars : hasMoreDrivers;

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f0e8]">
      <AppHeader locale={locale} variant="default" />

      {/* Filter bar */}
      <div className="sticky top-[57px] z-40 border-b-2 border-neutral-900 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
          <AddressInput
            value={location}
            onChange={(v) => { setLocation(v); setLatitude(null); setLongitude(null); }}
            onPlaceSelected={(p) => { setLocation(p.address); setLatitude(p.latitude); setLongitude(p.longitude); }}
            className="h-10 min-w-0 flex-1 rounded border-2 border-neutral-900 bg-white px-4 text-sm font-semibold text-neutral-900 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none"
            placeholder={t('search.locationPlaceholder')}
            showLocateMe
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded border-2 border-neutral-900 bg-white px-3 text-sm font-semibold text-neutral-900 sm:flex-initial focus:outline-none"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded border-2 border-neutral-900 bg-white px-3 text-sm font-semibold text-neutral-900 sm:flex-initial focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-[440px_1fr] md:h-[calc(100vh-113px)]">
        {/* Results panel */}
        <section className="overflow-y-auto border-r-2 border-neutral-900 bg-white p-4">
          {/* Type tabs */}
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setType(tab.value)}
                className={`rounded border-2 border-neutral-900 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors ${
                  type === tab.value
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {extraTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="rounded border-2 border-neutral-300 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-neutral-500 transition-colors hover:border-neutral-900 hover:text-neutral-900"
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Filters */}
          <div className="mt-3 flex flex-wrap gap-2">
            {SERVICE_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setServiceType((prev) => (prev === value ? '' : value))}
                className={`rounded border-2 border-neutral-900 px-2.5 py-1 text-xs font-black uppercase tracking-wide transition-all ${
                  serviceType === value
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {value === 'self_drive' ? t('filters.selfDrive') : t('filters.withDriver')}
              </button>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType | '')}
              className="h-9 rounded border-2 border-neutral-900 bg-white px-2 text-xs font-black uppercase tracking-wide text-neutral-900 focus:outline-none"
            >
              <option value="">{t('filters.carType')}</option>
              {VEHICLE_TYPES.map((item) => (
                <option key={item} value={item}>{VEHICLE_TYPE_LABELS[item] ?? item}</option>
              ))}
            </select>
            <select
              value={driverCategory}
              onChange={(e) => setDriverCategory(e.target.value as DriverCategory | '')}
              className="h-9 rounded border-2 border-neutral-900 bg-white px-2 text-xs font-black uppercase tracking-wide text-neutral-900 focus:outline-none"
            >
              <option value="">{t('filters.driverCategory')}</option>
              {DRIVER_CATEGORIES.map((item) => (
                <option key={item} value={item}>{CATEGORY_LABELS[item] ?? item}</option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
            {loading ? t('search.loading') : t('search.resultsCount', { count: mergedResults.length })}
          </p>
          {error ? (
            <p className="mt-2 rounded border-2 border-red-600 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>
          ) : null}

          <div className="mt-3 space-y-2">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => <ResultSkeleton key={i} />)
            ) : (
              <>
                {(type === 'all' || type === 'cars') && cars.map((car) => (
                  <Link key={car.id} href={`/${locale}/cars/${car.id}`}>
                    <div
                      onMouseEnter={() => setActivePin(car.id)}
                      className={`flex cursor-pointer gap-3 rounded-md border-2 bg-white p-3 transition-all hover:translate-x-px hover:translate-y-px ${
                        activePin === car.id
                          ? 'border-teal-600 shadow-brutal-teal-sm'
                          : 'border-neutral-900 shadow-brutal-xs hover:shadow-none'
                      }`}
                    >
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded border border-neutral-300 bg-neutral-100">
                        {car.photos?.[0] ? (
                          <Image
                            src={car.photos[0]}
                            alt={car.title}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-neutral-200">
                            <span className="text-2xl">🚗</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-neutral-900">{car.title}</p>
                        <p className="text-xs font-medium text-neutral-500">
                          {car.vehicleType} · {car.serviceType.replace('_', ' ')}
                        </p>
                        {car.distanceMeters != null && (
                          <p className="text-xs text-neutral-400">{(car.distanceMeters / 1000).toFixed(1)} km away</p>
                        )}
                        <p className="mt-1 text-sm font-black text-teal-700">
                          {car.dailyRateKigaliRwf
                            ? formatCurrencyRwf(car.dailyRateKigaliRwf)
                            : car.approximateDailyRateRangeRwf
                              ? formatRange(car.approximateDailyRateRangeRwf.kigali.min, car.approximateDailyRateRangeRwf.kigali.max)
                              : t('home.priceUnavailable')}
                          <span className="text-xs font-medium text-neutral-400"> /day</span>
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}

                {(type === 'all' || type === 'drivers') && drivers.map((driver) => (
                  <Link key={driver.id} href={`/${locale}/drivers/${driver.id}`}>
                    <div
                      onMouseEnter={() => setActivePin(driver.id)}
                      className={`flex cursor-pointer gap-3 rounded-md border-2 bg-white p-3 transition-all hover:translate-x-px hover:translate-y-px ${
                        activePin === driver.id
                          ? 'border-teal-600 shadow-brutal-teal-sm'
                          : 'border-neutral-900 shadow-brutal-xs hover:shadow-none'
                      }`}
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-neutral-900 bg-neutral-100">
                        {driver.profilePhotoUrl ? (
                          <Image src={driver.profilePhotoUrl} alt={driver.fullName} fill sizes="56px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-black uppercase text-neutral-400">
                            {driver.fullName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-neutral-900">{driver.fullName}</p>
                        <p className="text-xs font-medium text-neutral-500">{driver.categories.slice(0, 2).join(' · ')}</p>
                        {driver.distanceMeters != null && (
                          <p className="text-xs text-neutral-400">{(driver.distanceMeters / 1000).toFixed(1)} km away</p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded border border-teal-600 bg-teal-50 px-1.5 py-0.5 text-xs font-black text-teal-700">
                            {trustTierFromScore(driver.trustScore)}
                          </span>
                          <p className="text-xs font-black text-teal-700">
                            {driver.dailyRateRwf
                              ? formatCurrencyRwf(driver.dailyRateRwf)
                              : driver.approximateRateRangeRwf
                                ? formatRange(driver.approximateRateRangeRwf.daily.min, driver.approximateRateRangeRwf.daily.max)
                                : t('home.priceUnavailable')}
                            <span className="font-medium text-neutral-400"> /day</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {hasMore && (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full rounded border-2 border-neutral-900 bg-white py-2.5 text-xs font-black uppercase tracking-wide text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50"
                  >
                    {loadingMore ? t('search.loadingMore') : t('search.loadMore')}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* Map panel */}
        <section className="relative hidden bg-neutral-100 md:block">
          <SearchResultsMap
            centerHint={location || 'Kigali'}
            centerLatitude={latitude ?? undefined}
            centerLongitude={longitude ?? undefined}
            results={mergedResults}
            activeId={activePin}
            onActiveChange={setActivePin}
            emptyLabel={t('search.mapEmpty')}
            loadingLabel={t('map.loading')}
          />
        </section>
      </div>
    </main>
  );
}
