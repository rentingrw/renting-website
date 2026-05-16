'use client';

import { Car, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { AddressInput } from '@/components/web/address-input';
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

function CarCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border-2 border-neutral-900 bg-white shadow-brutal animate-pulse">
      <div className="aspect-[4/3] bg-neutral-200" />
      <div className="p-4 space-y-2">
        <div className="h-5 w-3/4 rounded bg-neutral-200" />
        <div className="h-4 w-1/2 rounded bg-neutral-200" />
        <div className="h-5 w-28 rounded bg-neutral-200" />
      </div>
    </div>
  );
}

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
    <main className="min-h-screen bg-[#f5f0e8]">
      <AppHeader locale={locale} variant="default" />

      {/* Filter bar */}
      <div className="sticky top-[57px] z-40 border-b-2 border-neutral-900 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <AddressInput
                value={location}
                onChange={(v) => { setLocation(v); setLatitude(null); setLongitude(null); }}
                onPlaceSelected={(p) => { setLocation(p.address); setLatitude(p.latitude); setLongitude(p.longitude); }}
                placeholder={t('search.locationPlaceholder')}
                className="h-10 w-full rounded border-2 border-neutral-900 bg-white pl-9 pr-4 text-sm font-semibold text-neutral-900 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setServiceType((prev) => (prev === st ? '' : st))}
                  className={`rounded border-2 border-neutral-900 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                    serviceType === st
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {st === 'self_drive' ? t('filters.selfDrive') : t('filters.withDriver')}
                </button>
              ))}
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType | '')}
                className="h-9 rounded border-2 border-neutral-900 bg-white px-3 text-xs font-black uppercase tracking-wide text-neutral-900 focus:outline-none"
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-black text-neutral-900">
          {location || 'Kigali'} — {t('tabs.cars')}
        </h1>
        <p className="mt-1 text-sm font-medium text-neutral-500">
          {loading ? t('search.loading') : t('search.resultsCount', { count: cars.length })}
        </p>
        {error && (
          <p className="mt-2 rounded border-2 border-red-600 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            [...Array(8)].map((_, i) => <CarCardSkeleton key={i} />)
          ) : (
            cars.map((car) => (
              <Link
                key={car.id}
                href={`/${locale}/cars/${car.id}`}
                className="group block overflow-hidden rounded-md border-2 border-neutral-900 bg-white shadow-brutal transition-all hover:translate-x-px hover:translate-y-px hover:shadow-brutal-sm"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                  <Image
                    src={car.photos?.[0] ?? stockImages.carPlaceholder}
                    alt={car.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute left-2 top-2 rounded border-2 border-neutral-900 bg-white px-2 py-0.5 text-xs font-black uppercase tracking-wide text-neutral-900">
                    {VEHICLE_TYPE_LABELS[car.vehicleType] ?? car.vehicleType}
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-black text-neutral-900">{car.title}</p>
                  <p className="mt-1 text-sm font-medium text-neutral-500">
                    {car.year} · {car.locationText}
                  </p>
                  <p className="mt-2 text-sm font-black text-teal-700">
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
                </div>
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
              className="rounded border-2 border-neutral-900 bg-white px-6 py-2.5 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50"
            >
              {loadingMore ? t('search.loadingMore') : t('search.loadMore')}
            </button>
          </div>
        )}

        {!loading && cars.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-neutral-900 bg-white shadow-brutal">
              <Car className="h-8 w-8 text-neutral-400" />
            </div>
            <h3 className="mt-5 text-xl font-black text-neutral-900">{t('search.noResults')}</h3>
            <p className="mt-2 max-w-xs text-sm font-medium text-neutral-500">{t('search.noResultsHint')}</p>
            <button
              type="button"
              onClick={() => { setLocation(''); setLatitude(null); setLongitude(null); setServiceType(''); setVehicleType(''); }}
              className="mt-6 rounded border-2 border-teal-800 bg-teal-600 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
            >
              {t('search.clearFilters')}
            </button>
          </div>
        )}

        {!loading && !hasMore && cars.length > 0 && (
          <p className="mt-8 text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">
            {t('search.allResultsShown', { count: cars.length })}
          </p>
        )}
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}
