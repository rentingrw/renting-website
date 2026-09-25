'use client';

import { Car } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { AddressInput } from '@/components/web/address-input';
import { CarListingCard } from '@/components/web/car-listing-card';
import { useFavoriteIds } from '@/components/web/favorite-button';
import {
  compactRwf,
  FilterButton,
  FilterRange,
  FilterSection,
  FilterSlider,
  ListingFilterRail,
} from '@/components/web/listing-filter-rail';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { searchMarketplace, type SearchCar, type ServiceType, type VehicleType } from '@/lib/api';

const VEHICLE_TYPES: VehicleType[] = ['suv', 'sedan', 'hatchback', 'pickup', 'van', 'truck'];
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  suv: 'SUV', sedan: 'Sedan', hatchback: 'Hatchback', pickup: 'Pickup', van: 'Van', truck: 'Truck',
};
const SERVICE_TYPES: ServiceType[] = ['self_drive', 'with_driver'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'] as const;
const PAGE_SIZE = 20;
const CAR_PRICE = { min: 20_000, max: 250_000, step: 5_000 };
const CAR_PRICE_PRESETS = {
  low: { min: 20_000, max: 80_000 },
  mid: { min: 80_000, max: 150_000 },
  high: { min: 150_000, max: 250_000 },
} as const;
const CURRENT_YEAR = new Date().getFullYear();

type ListingSort = 'score' | 'price_asc' | 'price_desc' | '';

function CarCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-5 w-28 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function CarsPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('web');
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [location, setLocation] = useState(searchParams.get('location') ?? '');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [transmission, setTransmission] = useState<'Manual' | 'Automatic' | ''>('');
  const [fuelType, setFuelType] = useState<string>('');
  const [seatsMin, setSeatsMin] = useState(2);
  const [yearMin, setYearMin] = useState(2010);
  const [priceMin, setPriceMin] = useState(CAR_PRICE.min);
  const [priceMax, setPriceMax] = useState(CAR_PRICE.max);
  const [availableNow, setAvailableNow] = useState(false);
  const [sort, setSort] = useState<ListingSort>('');
  const [cars, setCars] = useState<SearchCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const carFavorites = useFavoriteIds('car');

  function searchArgs(nextOffset: number) {
    return {
      type: 'cars' as const,
      location: location.trim() || undefined,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      serviceType: serviceType || undefined,
      vehicleType: vehicleType || undefined,
      transmission: transmission || undefined,
      fuelType: fuelType || undefined,
      seatsMin: seatsMin > 2 ? seatsMin : undefined,
      yearMin: yearMin > 2010 ? yearMin : undefined,
      priceMin: priceMin > CAR_PRICE.min ? priceMin : undefined,
      priceMax: priceMax < CAR_PRICE.max ? priceMax : undefined,
      availableNow: availableNow || undefined,
      sort: sort || undefined,
      limit: PAGE_SIZE,
      offset: nextOffset,
    };
  }

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
        const data = await searchMarketplace(searchArgs(0));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableNow, fuelType, location, latitude, longitude, priceMax, priceMin, seatsMin, serviceType, sort, t, transmission, vehicleType, yearMin]);

  async function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const data = await searchMarketplace(searchArgs(nextOffset));
      setCars((prev) => [...prev, ...data.cars]);
      setOffset(nextOffset);
      setHasMore(Boolean(data.pagination?.hasMoreCars));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('search.error'));
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleSort(next: ListingSort) {
    setSort((prev) => (prev === next ? '' : next));
  }

  function applyPricePreset(key: keyof typeof CAR_PRICE_PRESETS) {
    const preset = CAR_PRICE_PRESETS[key];
    if (priceMin === preset.min && priceMax === preset.max) {
      setPriceMin(CAR_PRICE.min);
      setPriceMax(CAR_PRICE.max);
      return;
    }
    setPriceMin(preset.min);
    setPriceMax(preset.max);
  }

  function clearFilters() {
    setLocation('');
    setLatitude(null);
    setLongitude(null);
    setServiceType('');
    setVehicleType('');
    setTransmission('');
    setFuelType('');
    setSeatsMin(2);
    setYearMin(2010);
    setPriceMin(CAR_PRICE.min);
    setPriceMax(CAR_PRICE.max);
    setAvailableNow(false);
    setSort('');
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />

      <div className="flex flex-col md:flex-row md:items-start">
        <ListingFilterRail>
          <AddressInput
            value={location}
            onChange={(v) => { setLocation(v); setLatitude(null); setLongitude(null); }}
            onPlaceSelected={(p) => { setLocation(p.address); setLatitude(p.latitude); setLongitude(p.longitude); }}
            placeholder={t('search.locationPlaceholder')}
            className="mb-1 h-10 w-full rounded-xl border-0 bg-white px-3 text-sm font-bold text-foreground placeholder:font-medium placeholder:text-muted-foreground focus:outline-none"
            showLocateMe
          />
          {SERVICE_TYPES.map((st) => (
            <FilterButton
              key={st}
              active={serviceType === st}
              onClick={() => setServiceType((prev) => (prev === st ? '' : st))}
            >
              {st === 'self_drive' ? t('filters.selfDrive') : t('filters.withDriver')}
            </FilterButton>
          ))}
          <FilterButton active={availableNow} onClick={() => setAvailableNow((prev) => !prev)}>
            {t('listing.available')}
          </FilterButton>
          <FilterButton active={sort === 'score'} onClick={() => toggleSort('score')}>
            {t('listing.topRated')}
          </FilterButton>
          <FilterButton active={sort === 'price_asc'} onClick={() => toggleSort('price_asc')}>
            {t('filters.sortLow')}
          </FilterButton>
          <FilterButton active={sort === 'price_desc'} onClick={() => toggleSort('price_desc')}>
            {t('filters.sortHigh')}
          </FilterButton>

          <FilterSection title={t('filters.price')}>
            <div className="grid grid-cols-3 gap-1.5">
              {(['low', 'mid', 'high'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPricePreset(key)}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${
                    priceMin === CAR_PRICE_PRESETS[key].min && priceMax === CAR_PRICE_PRESETS[key].max
                      ? 'border-white bg-white text-ink'
                      : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {key === 'low' ? t('filters.priceLow') : key === 'mid' ? t('filters.priceMid') : t('filters.priceHigh')}
                </button>
              ))}
            </div>
            <FilterRange
              label={t('listing.perDay')}
              min={CAR_PRICE.min}
              max={CAR_PRICE.max}
              step={CAR_PRICE.step}
              valueMin={priceMin}
              valueMax={priceMax}
              onChange={(nextMin, nextMax) => {
                setPriceMin(nextMin);
                setPriceMax(nextMax);
              }}
              format={compactRwf}
            />
          </FilterSection>

          <FilterSection title={t('filters.seats')}>
            <FilterSlider
              label={t('filters.seats')}
              min={2}
              max={12}
              value={seatsMin}
              onChange={setSeatsMin}
              format={(value) => t('filters.seatsValue', { count: value })}
            />
          </FilterSection>

          <FilterSection title={t('filters.year')}>
            <FilterSlider
              label={t('filters.year')}
              min={2010}
              max={CURRENT_YEAR}
              value={yearMin}
              onChange={setYearMin}
              format={(value) => t('filters.yearValue', { year: value })}
            />
          </FilterSection>

          {(['Manual', 'Automatic'] as const).map((value) => (
            <FilterButton
              key={value}
              active={transmission === value}
              onClick={() => setTransmission((prev) => (prev === value ? '' : value))}
            >
              {value === 'Manual' ? t('listing.manual') : t('listing.automatic')}
            </FilterButton>
          ))}

          <FilterSection title={t('filters.fuel')}>
            {FUEL_TYPES.map((item) => (
              <FilterButton
                key={item}
                active={fuelType === item}
                onClick={() => setFuelType((prev) => (prev === item ? '' : item))}
              >
                {t(`filters.${item.toLowerCase()}` as 'filters.petrol')}
              </FilterButton>
            ))}
          </FilterSection>

          <FilterSection title={t('filters.carType')}>
            {VEHICLE_TYPES.map((item) => (
              <FilterButton
                key={item}
                active={vehicleType === item}
                onClick={() => setVehicleType((prev) => (prev === item ? '' : item))}
              >
                {VEHICLE_TYPE_LABELS[item] ?? item}
              </FilterButton>
            ))}
          </FilterSection>
        </ListingFilterRail>

        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold text-foreground">{t('tabs.cars')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? t('search.loading') : t('search.resultsCount', { count: cars.length })}
          </p>
          {error ? (
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
          ) : null}

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              [...Array(8)].map((_, i) => <CarCardSkeleton key={i} />)
            ) : (
              cars.map((car) => (
                <CarListingCard
                  key={car.id}
                  car={car}
                  locale={locale}
                  favorited={carFavorites.ids.has(car.id)}
                  onFavoriteChange={(next) => carFavorites.setFavorited(car.id, next)}
                />
              ))
            )}
          </div>

          {!loading && hasMore ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-white hover:bg-ink/90 disabled:opacity-50"
              >
                {loadingMore ? t('search.loadingMore') : t('search.loadMore')}
              </button>
            </div>
          ) : null}

          {!loading && cars.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Car className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-bold text-foreground">{t('search.noResults')}</h3>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-full bg-ink px-5 py-2 text-sm font-bold text-white"
              >
                {t('search.clearFilters')}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}
