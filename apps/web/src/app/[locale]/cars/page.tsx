'use client';

import { Badge, Card, CardContent, Skeleton } from '@rentingi/ui';
import { Car, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { AddressInput } from '@/components/web/address-input';
import { LoadingSpinner } from '@/components/web/loading-states';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { searchMarketplace, type SearchCar, type ServiceType, type VehicleType } from '@/lib/api';
import { formatCurrencyRwf, formatRange } from '@/lib/format';
import { stockImages } from '@/lib/stock-images';

const VEHICLE_TYPES: VehicleType[] = ['suv', 'sedan', 'hatchback', 'pickup', 'van', 'truck'];
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  suv: 'SUV', sedan: 'Sedan', hatchback: 'Hatchback', pickup: 'Pickup', van: 'Van', truck: 'Truck',
};
const SERVICE_TYPES: ServiceType[] = ['self_drive', 'with_driver'];
const PAGE_SIZE = 20;

export default function CarsPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('web');
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [location, setLocation] = useState(searchParams.get('location') ?? 'Kigali');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [cars, setCars] = useState<SearchCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
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
          type: 'cars',
          location,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          serviceType: serviceType || undefined,
          vehicleType: vehicleType || undefined,
          limit: PAGE_SIZE,
          offset: 0,
        });
        if (!cancelled) {
          setCars(data.cars);
          setHasMore(Boolean(data.pagination?.hasMoreCars));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('search.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    runSearch();
    return () => { cancelled = true; };
  }, [location, latitude, longitude, serviceType, vehicleType, t]);

  async function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const data = await searchMarketplace({
        type: 'cars',
        location,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        serviceType: serviceType || undefined,
        vehicleType: vehicleType || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setCars((prev) => [...prev, ...data.cars]);
      setOffset(nextOffset);
      setHasMore(Boolean(data.pagination?.hasMoreCars));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('search.error'));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader locale={locale} variant="default" />

      <div className="sticky top-[57px] z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <AddressInput
                value={location}
                onChange={(v) => { setLocation(v); setLatitude(null); setLongitude(null); }}
                onPlaceSelected={(p) => { setLocation(p.address); setLatitude(p.latitude); setLongitude(p.longitude); }}
                placeholder={t('search.locationPlaceholder')}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-gray-900 placeholder:text-gray-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setServiceType((prev) => (prev === st ? '' : st))}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    serviceType === st
                      ? 'bg-teal-600 text-white'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {st === 'self_drive' ? t('filters.selfDrive') : t('filters.withDriver')}
                </button>
              ))}
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType | '')}
                className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900"
              >
                <option value="">{t('filters.carType')}</option>
                {VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>{VEHICLE_TYPE_LABELS[v] ?? v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {location || 'Kigali'} — {t('tabs.cars')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? t('search.loading') : t('search.resultsCount', { count: cars.length })}
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-gray-200 bg-white">
                <Skeleton className="aspect-[4/3] w-full bg-gray-200" />
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4 bg-gray-200" />
                  <Skeleton className="mt-2 h-4 w-1/2 bg-gray-200" />
                  <Skeleton className="mt-3 h-6 w-24 bg-gray-200" />
                </CardContent>
              </Card>
            ))
          ) : (
            cars.map((car) => (
              <Link key={car.id} href={`/${locale}/cars/${car.id}`}>
                <Card className="overflow-hidden border-gray-200 bg-white shadow-sm transition hover:shadow-md">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <Image
                      src={car.photos?.[0] ?? stockImages.carPlaceholder}
                      alt={car.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition hover:scale-105"
                    />
                    <Badge className="absolute left-2 top-2 bg-white/90 text-gray-800 shadow-sm">
                      {car.vehicleType}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <p className="font-semibold text-gray-900">{car.title}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {car.year} · {car.locationText}
                    </p>
                    <p className="mt-2 text-sm font-medium text-teal-600">
                      {car.dailyRateKigaliRwf
                        ? formatCurrencyRwf(car.dailyRateKigaliRwf)
                        : car.approximateDailyRateRangeRwf
                          ? formatRange(
                              car.approximateDailyRateRangeRwf.kigali.min,
                              car.approximateDailyRateRangeRwf.kigali.max,
                            )
                          : t('home.priceUnavailable')}{' '}
                      / {t('home.day')}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>

        {!loading && hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
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
          </div>
        )}

        {!loading && cars.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Car className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{t('search.noResults')}</h3>
            <p className="mt-2 max-w-xs text-sm text-gray-500">{t('search.noResultsHint')}</p>
            <button
              type="button"
              onClick={() => { setLocation(''); setLatitude(null); setLongitude(null); setServiceType(''); setVehicleType(''); }}
              className="mt-6 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              {t('search.clearFilters')}
            </button>
          </div>
        )}

        {!loading && !hasMore && cars.length > 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">{t('search.allResultsShown', { count: cars.length })}</p>
        )}
      </div>
    </main>
  );
}
