'use client';

import { Badge, Card, CardContent, Skeleton, Tabs, TabsList, TabsTrigger } from '@rentingi/ui';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import Image from 'next/image';
import { AppHeader } from '@/components/web/app-header';
import { AddressInput } from '@/components/web/address-input';
import { LoadingSpinner } from '@/components/web/loading-states';
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
      <div className="flex h-full min-h-[400px] items-center justify-center bg-gray-100">
        <LoadingSpinner className="h-8 w-8 text-teal-600" />
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
    async function runSearch() {
      setLoading(true);
      setError(null);
      setOffset(0);
      try {
        const data = await searchMarketplace({
          type,
          location,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          from: from || undefined,
          to: to || undefined,
          serviceType: serviceType || undefined,
          vehicleType: vehicleType || undefined,
          driverCategory: driverCategory || undefined,
          limit: PAGE_SIZE,
          offset: 0,
        });
        if (!cancelled) {
          setCars(data.cars);
          setDrivers(data.drivers);
          setHasMoreCars(Boolean(data.pagination?.hasMoreCars));
          setHasMoreDrivers(Boolean(data.pagination?.hasMoreDrivers));
          setActivePin(data.cars[0]?.id ?? data.drivers[0]?.id ?? null);
        }
      } catch (searchError) {
        if (!cancelled) {
          setError(searchError instanceof Error ? searchError.message : t('search.error'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    runSearch();
    return () => {
      cancelled = true;
    };
  }, [driverCategory, from, latitude, location, longitude, serviceType, t, to, type, vehicleType]);

  async function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await searchMarketplace({
        type,
        location,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        from: from || undefined,
        to: to || undefined,
        serviceType: serviceType || undefined,
        vehicleType: vehicleType || undefined,
        driverCategory: driverCategory || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setCars((previous) => [...previous, ...data.cars]);
      setDrivers((previous) => [...previous, ...data.drivers]);
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
      ...(includeCars
        ? cars.map((car) => {
            const priceLabel = car.dailyRateKigaliRwf
              ? formatCurrencyRwf(car.dailyRateKigaliRwf) + '/day'
              : car.approximateDailyRateRangeRwf
                ? formatRange(car.approximateDailyRateRangeRwf.kigali.min, car.approximateDailyRateRangeRwf.kigali.max) + '/day'
                : null;
            return {
              id: car.id,
              label: car.title,
              address: car.locationText,
              photo: car.photos?.[0] ?? null,
              priceLabel,
              href: `/${locale}/cars/${car.id}`,
              kind: 'car' as const,
              description: [car.vehicleType, car.serviceType.replace('_', ' ')].filter(Boolean).join(' • '),
              latitude: car.pickupLatitude,
              longitude: car.pickupLongitude,
            };
          })
        : []),
      ...(includeDrivers
        ? drivers.map((driver) => {
            const priceLabel = driver.dailyRateRwf
              ? formatCurrencyRwf(driver.dailyRateRwf) + '/day'
              : driver.approximateRateRangeRwf
                ? formatRange(driver.approximateRateRangeRwf.daily.min, driver.approximateRateRangeRwf.daily.max) + '/day'
                : null;
            return {
              id: driver.id,
              label: driver.fullName,
              address: driver.primaryCity,
              photo: driver.profilePhotoUrl ?? null,
              priceLabel,
              href: `/${locale}/drivers/${driver.id}`,
              kind: 'driver' as const,
              description: driver.categories.slice(0, 2).join(' • '),
              latitude: driver.primaryCityLatitude,
              longitude: driver.primaryCityLongitude,
            };
          })
        : []),
    ];
  }, [cars, drivers, locale, type]);

  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader locale={locale} variant="default" />
      <div className="sticky top-[57px] z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
          <AddressInput
            value={location}
            onChange={(nextValue) => {
              setLocation(nextValue);
              setLatitude(null);
              setLongitude(null);
            }}
            onPlaceSelected={(place) => {
              setLocation(place.address);
              setLatitude(place.latitude);
              setLongitude(place.longitude);
            }}
            className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            placeholder={t('search.locationPlaceholder')}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 sm:flex-initial"
            />
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 sm:flex-initial"
            />
          </div>
        </div>
      </div>

      <div className="grid min-h-[50vh] grid-cols-1 md:grid-cols-[440px_1fr] md:h-[calc(100vh-120px)]">
        <section className="overflow-y-auto border-r border-gray-200 bg-white p-4">
          <Tabs value={type} onValueChange={(value) => setType(value as SearchType)}>
            <TabsList className="w-full bg-gray-100">
              <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                {t('tabs.all')}
              </TabsTrigger>
              <TabsTrigger value="cars" className="flex-1 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                {t('tabs.cars')}
              </TabsTrigger>
              <TabsTrigger value="drivers" className="flex-1 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                {t('tabs.drivers')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4 flex flex-wrap gap-2">
            {SERVICE_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setServiceType((prev) => (prev === value ? '' : value))}
                className={`rounded-full border px-3 py-1 text-xs ${
                  serviceType === value
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {value === 'self_drive' ? t('filters.selfDrive') : t('filters.withDriver')}
              </button>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              value={vehicleType}
              onChange={(event) => setVehicleType(event.target.value as VehicleType | '')}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
            >
              <option value="">{t('filters.carType')}</option>
              {VEHICLE_TYPES.map((item) => (
                <option key={item} value={item}>{VEHICLE_TYPE_LABELS[item] ?? item}</option>
              ))}
            </select>
            <select
              value={driverCategory}
              onChange={(event) => setDriverCategory(event.target.value as DriverCategory | '')}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
            >
              <option value="">{t('filters.driverCategory')}</option>
              {DRIVER_CATEGORIES.map((item) => (
                <option key={item} value={item}>{CATEGORY_LABELS[item] ?? item}</option>
              ))}
            </select>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            {loading ? t('search.loading') : t('search.resultsCount', { count: mergedResults.length })}
          </p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

          <div className="mt-3 space-y-3">
            {loading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-4">
                    <Skeleton className="h-14 w-20 shrink-0 rounded bg-gray-200" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 bg-gray-200" />
                      <Skeleton className="h-3 w-1/2 bg-gray-200" />
                      <Skeleton className="h-4 w-24 bg-gray-200" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {(type === 'all' || type === 'cars') &&
                  cars.map((car) => (
                    <Link key={car.id} href={`/${locale}/cars/${car.id}`}>
                      <Card
                        onMouseEnter={() => setActivePin(car.id)}
                        className={`cursor-pointer overflow-hidden border-gray-200 bg-white transition hover:border-teal-500/50 hover:shadow-md ${
                          activePin === car.id ? 'border-teal-500 shadow-md ring-1 ring-teal-500/20' : ''
                        }`}
                      >
                        <CardContent className="flex gap-3 p-3">
                          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-gray-100">
                            <Image
                              src={car.photos?.[0] ?? '/placeholder-car.jpg'}
                              alt={car.title}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">{car.title}</p>
                            <p className="text-xs text-gray-500">
                              {car.vehicleType} • {car.serviceType.replace('_', ' ')}
                            </p>
                            {car.distanceMeters != null && (
                              <p className="text-xs text-gray-400">{(car.distanceMeters / 1000).toFixed(1)} km away</p>
                            )}
                            <p className="mt-1 text-sm font-semibold text-teal-600">
                              {car.dailyRateKigaliRwf
                                ? formatCurrencyRwf(car.dailyRateKigaliRwf)
                                : car.approximateDailyRateRangeRwf
                                  ? formatRange(car.approximateDailyRateRangeRwf.kigali.min, car.approximateDailyRateRangeRwf.kigali.max)
                                  : t('home.priceUnavailable')}
                              <span className="text-xs font-normal text-gray-400"> /day</span>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}

                {(type === 'all' || type === 'drivers') &&
              drivers.map((driver) => (
                <Link key={driver.id} href={`/${locale}/drivers/${driver.id}`}>
                  <Card
                    onMouseEnter={() => setActivePin(driver.id)}
                    className={`cursor-pointer overflow-hidden border-gray-200 bg-white transition hover:border-teal-500/50 hover:shadow-md ${
                      activePin === driver.id ? 'border-teal-500 shadow-md ring-1 ring-teal-500/20' : ''
                    }`}
                  >
                    <CardContent className="flex gap-3 p-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                        {driver.profilePhotoUrl ? (
                          <Image src={driver.profilePhotoUrl} alt={driver.fullName} fill sizes="56px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400 text-xs font-bold uppercase">
                            {driver.fullName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{driver.fullName}</p>
                        <p className="text-xs text-gray-500">{driver.categories.slice(0, 2).join(' • ')}</p>
                        {driver.distanceMeters != null && (
                          <p className="text-xs text-gray-400">{(driver.distanceMeters / 1000).toFixed(1)} km away</p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <Badge className="bg-teal-50 text-teal-700 text-xs">{trustTierFromScore(driver.trustScore)}</Badge>
                          <p className="text-xs font-semibold text-teal-600">
                            {driver.dailyRateRwf
                              ? formatCurrencyRwf(driver.dailyRateRwf)
                              : driver.approximateRateRangeRwf
                                ? formatRange(driver.approximateRateRangeRwf.daily.min, driver.approximateRateRangeRwf.daily.max)
                                : t('home.priceUnavailable')}
                            <span className="font-normal text-gray-400"> /day</span>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
                {(type === 'all' ? hasMoreCars || hasMoreDrivers : type === 'cars' ? hasMoreCars : hasMoreDrivers) ? (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
                    {t('search.loadingMore')}
                  </>
                ) : (
                  t('search.loadMore')
                )}
              </button>
            ) : null}
              </>
            )}
          </div>
        </section>

        <section className="relative hidden bg-gray-100 md:block">
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
