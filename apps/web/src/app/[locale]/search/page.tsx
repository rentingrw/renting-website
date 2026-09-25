'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { AddressInput } from '@/components/web/address-input';
import { FavoriteButton, useFavoriteIds } from '@/components/web/favorite-button';
import { InitialsAvatar } from '@/components/web/initials-avatar';
import { ShareMenu } from '@/components/web/share-menu';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  searchMarketplace,
  type DriverCategory,
  type SearchCar,
  type SearchDriver,
  type SearchTaxi,
  type SearchType,
  type ServiceType,
  type VehicleType,
} from '@/lib/api';
import { TrustBadge } from '@/components/web/trust-badge';
import { SearchFilterBar } from '@/components/web/search-filter-bar';
import { formatCurrencyRwf, formatRange } from '@/lib/format';

const SearchResultsMap = dynamic(
  () => import('@/components/web/search-results-map').then((m) => ({ default: m.SearchResultsMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[400px] items-center justify-center border-l-2 border-border bg-muted">
        <span className="text-sm font-semibold text-muted-foreground">Loading map…</span>
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
    <div className="flex animate-pulse gap-3 rounded-xl border border-white/10 bg-white/10 p-3">
      <div className="h-16 w-24 shrink-0 rounded bg-white/10" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-white/10" />
        <div className="h-3 w-1/2 rounded bg-white/10" />
        <div className="h-4 w-24 rounded bg-white/10" />
      </div>
    </div>
  );
}

function panelChip(active: boolean) {
  return `rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
    active
      ? 'border-white bg-white text-ink'
      : 'border-white/20 bg-white/10 text-white/85 hover:bg-white/15'
  }`;
}

export default function SearchPage({ params }: SearchPageProps) {
  const t = useTranslations('web');
  const searchParams = useSearchParams();
  const initialLatitude = parseCoordinate(searchParams.get('latitude'));
  const initialLongitude = parseCoordinate(searchParams.get('longitude'));
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [type, setType] = useState<SearchType>((searchParams.get('type') as SearchType) ?? 'all');
  const [location, setLocation] = useState(searchParams.get('location') ?? '');
  const [latitude, setLatitude] = useState<number | null>(initialLatitude);
  const [longitude, setLongitude] = useState<number | null>(initialLongitude);
  const [from, setFrom] = useState(searchParams.get('from') ?? '');
  const [to, setTo] = useState(searchParams.get('to') ?? '');
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [driverCategory, setDriverCategory] = useState<DriverCategory | ''>('');
  const [cars, setCars] = useState<SearchCar[]>([]);
  const [drivers, setDrivers] = useState<SearchDriver[]>([]);
  const [taxis, setTaxis] = useState<SearchTaxi[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMoreCars, setHasMoreCars] = useState(false);
  const [hasMoreDrivers, setHasMoreDrivers] = useState(false);
  const [hasMoreTaxis, setHasMoreTaxis] = useState(false);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [availableNow, setAvailableNow] = useState(false);
  const [topRated, setTopRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    async function runSearch() {
      setLoading(true);
      setError(null);
      setOffset(0);
      try {
        const data = await searchMarketplace({
          type, location: location.trim() || undefined,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          from: from || undefined,
          to: to || undefined,
          serviceType: serviceType || undefined,
          vehicleType: vehicleType || undefined,
          driverCategory: driverCategory || undefined,
          availableNow: availableNow || undefined,
          sort: topRated ? 'score' : undefined,
          limit: PAGE_SIZE, offset: 0,
        });
        if (!cancelled) {
          setCars(data.cars);
          setDrivers(data.drivers);
          setTaxis(data.taxis ?? []);
          setHasMoreCars(Boolean(data.pagination?.hasMoreCars));
          setHasMoreDrivers(Boolean(data.pagination?.hasMoreDrivers));
          setHasMoreTaxis(Boolean(data.pagination?.hasMoreTaxis));
          setActivePin(data.cars[0]?.id ?? data.drivers[0]?.id ?? data.taxis?.[0]?.id ?? null);
        }
      } catch (searchError) {
        if (!cancelled) setError(searchError instanceof Error ? searchError.message : t('search.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    runSearch();
    return () => { cancelled = true; };
  }, [availableNow, driverCategory, from, latitude, location, longitude, serviceType, t, to, topRated, type, vehicleType]);

  async function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await searchMarketplace({
        type, location: location.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        from: from || undefined,
        to: to || undefined,
        serviceType: serviceType || undefined,
        vehicleType: vehicleType || undefined,
          driverCategory: driverCategory || undefined,
          availableNow: availableNow || undefined,
          sort: topRated ? 'score' : undefined,
          limit: PAGE_SIZE, offset: nextOffset,
      });
      setCars((prev) => [...prev, ...data.cars]);
      setDrivers((prev) => [...prev, ...data.drivers]);
      setTaxis((prev) => [...prev, ...(data.taxis ?? [])]);
      setOffset(nextOffset);
      setHasMoreCars(Boolean(data.pagination?.hasMoreCars));
      setHasMoreDrivers(Boolean(data.pagination?.hasMoreDrivers));
      setHasMoreTaxis(Boolean(data.pagination?.hasMoreTaxis));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : t('search.error'));
    } finally {
      setLoadingMore(false);
    }
  }

  const mergedResults = useMemo(() => {
    const includeCars = type === 'all' || type === 'cars';
    const includeDrivers = type === 'all' || type === 'drivers';
    const includeTaxis = type === 'all' || type === 'taxis';
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
      ...(includeTaxis ? taxis.map((taxi) => {
        const bits = [
          taxi.vehicleType,
          taxi.carModel,
          taxi.seats ? `${taxi.seats} seats` : null,
        ].filter(Boolean);
        return {
          id: taxi.id,
          label: taxi.fullName,
          address: taxi.city,
          photo: taxi.profilePhotoUrl ?? taxi.photoUrl ?? taxi.photos?.[0] ?? null,
          priceLabel: taxi.phone,
          href: `/${locale}/taxi-drivers/${taxi.id}`,
          kind: 'taxi' as const,
          description: bits.join(' • '),
          latitude: taxi.cityLatitude,
          longitude: taxi.cityLongitude,
        };
      }) : []),
    ];
  }, [cars, drivers, locale, taxis, type]);

  const tabs: { value: SearchType; label: string }[] = [
    { value: 'all', label: t('tabs.all') },
    { value: 'cars', label: t('tabs.cars') },
    { value: 'drivers', label: t('tabs.drivers') },
    { value: 'taxis', label: t('tabs.taxi') },
  ];

  const extraTabs = [
    { href: `/${locale}/stays`, label: t('tabs.stays') },
  ];

  const hasMore =
    type === 'all'
      ? hasMoreCars || hasMoreDrivers || hasMoreTaxis
      : type === 'cars'
        ? hasMoreCars
        : type === 'drivers'
          ? hasMoreDrivers
          : hasMoreTaxis;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppHeader locale={locale} variant="default" />

      {/* Filter bar */}
      <div className="sticky top-[57px] z-40 border-b-2 border-border bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
          <AddressInput
            value={location}
            onChange={(v) => { setLocation(v); setLatitude(null); setLongitude(null); }}
            onPlaceSelected={(p) => { setLocation(p.address); setLatitude(p.latitude); setLongitude(p.longitude); }}
            className="h-10 min-w-0 flex-1 rounded border-2 border-border bg-card px-4 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
            placeholder={t('search.locationPlaceholder')}
            showLocateMe
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded border-2 border-border bg-card px-3 text-sm font-semibold text-foreground sm:flex-initial focus:outline-none"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded border-2 border-border bg-card px-3 text-sm font-semibold text-foreground sm:flex-initial focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex border-b border-white/10 bg-ink md:hidden">
        {(['list', 'map'] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setMobileView(view)}
            className={`flex-1 py-2.5 text-sm font-semibold ${
              mobileView === view ? 'bg-white text-ink' : 'text-white/70'
            }`}
          >
            {view === 'list' ? t('search.showList') : t('search.showMap')}
          </button>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-[440px_1fr] md:h-[calc(100vh-113px)]">
        {/* Results panel */}
        <section className={`${mobileView === 'map' ? 'hidden' : 'block'} overflow-y-auto bg-ink p-4 text-white md:block`}>
          {/* Type tabs */}
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setType(tab.value)}
                className={panelChip(type === tab.value)}
              >
                {tab.label}
              </button>
            ))}
            {extraTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={panelChip(false)}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <SearchFilterBar
            variant="dark"
            availableNow={availableNow}
            onAvailableNowChange={setAvailableNow}
            topRated={topRated}
            onTopRatedChange={setTopRated}
            resultCount={mergedResults.length}
            loading={loading}
            extra={
              <>
                {SERVICE_TYPES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setServiceType((prev) => (prev === value ? '' : value))}
                    className={panelChip(serviceType === value)}
                  >
                    {value === 'self_drive' ? t('filters.selfDrive') : t('filters.withDriver')}
                  </button>
                ))}
              </>
            }
            moreFilters={
              <div className="grid grid-cols-1 gap-3">
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType | '')}
                  className="h-10 rounded border-2 border-border bg-card px-3 text-sm font-semibold text-foreground"
                >
                  <option value="">{t('filters.carType')}</option>
                  {VEHICLE_TYPES.map((item) => (
                    <option key={item} value={item}>{VEHICLE_TYPE_LABELS[item] ?? item}</option>
                  ))}
                </select>
                <select
                  value={driverCategory}
                  onChange={(e) => setDriverCategory(e.target.value as DriverCategory | '')}
                  className="h-10 rounded border-2 border-border bg-card px-3 text-sm font-semibold text-foreground"
                >
                  <option value="">{t('filters.driverCategory')}</option>
                  {DRIVER_CATEGORIES.map((item) => (
                    <option key={item} value={item}>{CATEGORY_LABELS[item] ?? item}</option>
                  ))}
                </select>
              </div>
            }
          />
          {error ? (
            <p className="mt-2 rounded border-2 border-red-600 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>
          ) : null}

          <div className="mt-3 space-y-2">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => <ResultSkeleton key={i} />)
            ) : mergedResults.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-white">{t('search.noResults')}</p>
                <button
                  type="button"
                  onClick={() => {
                    setAvailableNow(false);
                    setTopRated(false);
                    setServiceType('');
                    setVehicleType('');
                    setDriverCategory('');
                  }}
                  className="mt-4 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                >
                  {t('search.clearFilters')}
                </button>
              </div>
            ) : (
              <>
                {(type === 'all' || type === 'cars') && cars.map((car) => (
                  <div key={car.id} className="relative">
                    <Link href={`/${locale}/cars/${car.id}`}>
                    <div
                      onMouseEnter={() => setActivePin(car.id)}
                      className={`flex cursor-pointer gap-3 rounded-xl border bg-card p-3 pr-16 transition hover:shadow-soft ${
                        activePin === car.id
                          ? 'border-hill shadow-soft-sm'
                          : 'border-border'
                      }`}
                    >
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded border border-neutral-300 bg-muted">
                        {car.photos?.[0] ? (
                          <Image
                            src={car.photos[0]}
                            alt={car.title}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <span className="text-2xl">🚗</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{car.title}</p>
                        <p className="text-xs font-medium text-muted-foreground">
                          {car.vehicleType} · {car.serviceType.replace('_', ' ')}
                          {car.isBookedNow ? ` · ${t('listing.booked')}` : ` · ${t('listing.available')}`}
                        </p>
                        {car.distanceMeters != null && (
                          <p className="text-xs text-muted-foreground">
                            {t('search.kmAway', { km: (car.distanceMeters / 1000).toFixed(1) })}
                          </p>
                        )}
                        <p className="mt-1 text-sm font-semibold text-brand">
                          {car.dailyRateKigaliRwf
                            ? formatCurrencyRwf(car.dailyRateKigaliRwf)
                            : car.approximateDailyRateRangeRwf
                              ? formatRange(car.approximateDailyRateRangeRwf.kigali.min, car.approximateDailyRateRangeRwf.kigali.max)
                              : t('home.priceUnavailable')}
                          <span className="text-xs font-medium text-muted-foreground"> /day</span>
                        </p>
                      </div>
                    </div>
                    </Link>
                    <div className="absolute right-2 top-2 z-10 flex gap-1">
                      <FavoriteButton
                        kind="car"
                        id={car.id}
                        favorited={carFavorites.ids.has(car.id)}
                        onChanged={(next) => carFavorites.setFavorited(car.id, next)}
                      />
                      <ShareMenu url={`/${locale}/cars/${car.id}`} title={car.title} />
                    </div>
                  </div>
                ))}

                {(type === 'all' || type === 'drivers') && drivers.map((driver) => (
                  <div key={driver.id} className="relative">
                    <Link href={`/${locale}/drivers/${driver.id}`}>
                    <div
                      onMouseEnter={() => setActivePin(driver.id)}
                      className={`flex cursor-pointer gap-3 rounded-xl border bg-card p-3 pr-16 transition hover:shadow-soft ${
                        activePin === driver.id
                          ? 'border-sky-500 shadow-soft-sm'
                          : 'border-border'
                      }`}
                    >
                      <InitialsAvatar name={driver.fullName} src={driver.profilePhotoUrl} size={56} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-foreground">{driver.fullName}</p>
                        <p className="text-xs font-medium text-muted-foreground">{driver.categories.slice(0, 2).join(' · ')}</p>
                        {driver.distanceMeters != null && (
                          <p className="text-xs text-muted-foreground">
                            {t('search.kmAway', { km: (driver.distanceMeters / 1000).toFixed(1) })}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <TrustBadge score={driver.trustScore} />
                          <p className="text-xs font-black text-brand">
                            {driver.dailyRateRwf
                              ? formatCurrencyRwf(driver.dailyRateRwf)
                              : driver.approximateRateRangeRwf
                                ? formatRange(driver.approximateRateRangeRwf.daily.min, driver.approximateRateRangeRwf.daily.max)
                                : t('home.priceUnavailable')}
                            <span className="font-medium text-muted-foreground"> /day</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    </Link>
                    <div className="absolute right-2 top-2 z-10 flex gap-1">
                      <FavoriteButton
                        kind="driver"
                        id={driver.id}
                        favorited={driverFavorites.ids.has(driver.id)}
                        onChanged={(next) => driverFavorites.setFavorited(driver.id, next)}
                      />
                      <ShareMenu url={`/${locale}/drivers/${driver.id}`} title={driver.fullName} />
                    </div>
                  </div>
                ))}

                {(type === 'all' || type === 'taxis') && taxis.map((taxi) => (
                  <div key={taxi.id} className="relative">
                    <Link href={`/${locale}/taxi-drivers/${taxi.id}`}>
                    <div
                      onMouseEnter={() => setActivePin(taxi.id)}
                      className={`flex cursor-pointer gap-3 rounded-xl border bg-card p-3 pr-16 transition hover:shadow-soft ${
                        activePin === taxi.id
                          ? 'border-red-500 shadow-soft-sm'
                          : 'border-border'
                      }`}
                    >
                      <InitialsAvatar
                        name={taxi.fullName}
                        src={taxi.profilePhotoUrl ?? taxi.photoUrl ?? taxi.photos?.[0] ?? null}
                        size={56}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-foreground">{taxi.fullName}</p>
                        <p className="text-xs font-medium text-muted-foreground">
                          {taxi.city}
                          {taxi.carModel ? ` · ${taxi.carModel}` : ''}
                          {taxi.seats ? ` · ${taxi.seats} seats` : ''}
                        </p>
                        {taxi.distanceMeters != null && (
                          <p className="text-xs text-muted-foreground">
                            {t('search.kmAway', { km: (taxi.distanceMeters / 1000).toFixed(1) })}
                          </p>
                        )}
                        <p className="mt-1 text-sm font-semibold text-red-700">{taxi.phone}</p>
                      </div>
                    </div>
                    </Link>
                    <div className="absolute right-2 top-2 z-10 flex gap-1">
                      <ShareMenu url={`/${locale}/taxi-drivers/${taxi.id}`} title={taxi.fullName} />
                    </div>
                  </div>
                ))}

                {hasMore && (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-ink hover:bg-white/90 disabled:opacity-50"
                  >
                    {loadingMore ? t('search.loadingMore') : t('search.loadMore')}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* Map panel */}
        <section className={`${mobileView === 'list' ? 'hidden' : 'block'} relative min-h-[60vh] bg-muted md:block`}>
          <SearchResultsMap
            centerHint={location.trim() || undefined}
            centerLatitude={latitude ?? undefined}
            centerLongitude={longitude ?? undefined}
            results={mergedResults}
            activeId={activePin}
            onActiveChange={setActivePin}
            emptyLabel={t('search.mapEmpty')}
            loadingLabel={t('map.loading')}
            viewDetailsLabel={t('map.viewDetails')}
            kindLabels={{
              car: t('map.kindCar'),
              driver: t('map.kindDriver'),
              taxi: t('map.kindTaxi'),
            }}
            legendLabels={{
              car: t('map.legendCars'),
              driver: t('map.legendDrivers'),
              taxi: t('map.legendTaxis'),
            }}
          />
        </section>
      </div>
    </main>
  );
}
