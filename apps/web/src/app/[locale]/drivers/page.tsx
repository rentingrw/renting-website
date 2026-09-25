'use client';

import { UserRound } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { AddressInput } from '@/components/web/address-input';
import { DriverListingCard } from '@/components/web/driver-listing-card';
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
import { searchMarketplace, type DriverCategory, type SearchDriver } from '@/lib/api';

const LICENSE_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F'];
const DRIVER_CATEGORIES: DriverCategory[] = ['city', 'outstation', 'airport', 'chauffeur', 'tour_guide', 'delivery'];
const PAGE_SIZE = 20;
const DRIVER_PRICE = { min: 10_000, max: 150_000, step: 5_000 };
const DRIVER_PRICE_PRESETS = {
  low: { min: 10_000, max: 40_000 },
  mid: { min: 40_000, max: 80_000 },
  high: { min: 80_000, max: 150_000 },
} as const;

type ListingSort = 'rating' | 'price_asc' | 'price_desc' | '';

function DriverCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card animate-pulse">
      <div className="border-b-2 border-border bg-brand-soft p-5 flex flex-col items-center">
        <div className="h-20 w-20 rounded-full border-2 border-border bg-muted" />
        <div className="mt-3 h-5 w-32 rounded bg-muted" />
        <div className="mt-2 h-4 w-24 rounded bg-muted" />
      </div>
      <div className="p-4 space-y-2">
        <div className="h-5 w-20 rounded bg-muted" />
        <div className="h-4 w-28 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function DriversPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('web');
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [location, setLocation] = useState(searchParams.get('location') ?? '');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [driverHasVehicle, setDriverHasVehicle] = useState<boolean | null>(null);
  const [driverTransmission, setDriverTransmission] = useState<'Manual' | 'Automatic' | null>(null);
  const [driverLicenseCategory, setDriverLicenseCategory] = useState<string | null>(null);
  const [driverCategory, setDriverCategory] = useState<DriverCategory | ''>('');
  const [experienceMin, setExperienceMin] = useState(0);
  const [priceMin, setPriceMin] = useState(DRIVER_PRICE.min);
  const [priceMax, setPriceMax] = useState(DRIVER_PRICE.max);
  const [availableNow, setAvailableNow] = useState(false);
  const [sort, setSort] = useState<ListingSort>('');
  const [drivers, setDrivers] = useState<SearchDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const driverFavorites = useFavoriteIds('driver');

  function searchArgs(nextOffset: number) {
    return {
      type: 'drivers' as const,
      location: location.trim() || undefined,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      driverHasVehicle: driverHasVehicle ?? undefined,
      driverTransmission: driverTransmission ?? undefined,
      driverLicenseCategory: driverLicenseCategory ?? undefined,
      driverCategory: driverCategory || undefined,
      experienceMin: experienceMin > 0 ? experienceMin : undefined,
      priceMin: priceMin > DRIVER_PRICE.min ? priceMin : undefined,
      priceMax: priceMax < DRIVER_PRICE.max ? priceMax : undefined,
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
          setDrivers(data.drivers);
          setHasMore(Boolean(data.pagination?.hasMoreDrivers));
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
  }, [availableNow, driverCategory, driverHasVehicle, driverLicenseCategory, driverTransmission, experienceMin, location, latitude, longitude, priceMax, priceMin, sort, t]);

  async function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const data = await searchMarketplace(searchArgs(nextOffset));
      setDrivers((prev) => [...prev, ...data.drivers]);
      setOffset(nextOffset);
      setHasMore(Boolean(data.pagination?.hasMoreDrivers));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('search.error'));
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleSort(next: ListingSort) {
    setSort((prev) => (prev === next ? '' : next));
  }

  function applyPricePreset(key: keyof typeof DRIVER_PRICE_PRESETS) {
    const preset = DRIVER_PRICE_PRESETS[key];
    if (priceMin === preset.min && priceMax === preset.max) {
      setPriceMin(DRIVER_PRICE.min);
      setPriceMax(DRIVER_PRICE.max);
      return;
    }
    setPriceMin(preset.min);
    setPriceMax(preset.max);
  }

  function categoryLabel(category: DriverCategory) {
    if (category === 'tour_guide') return t('filters.tourGuide');
    return t(`filters.${category}` as 'filters.city');
  }

  function clearFilters() {
    setLocation('');
    setLatitude(null);
    setLongitude(null);
    setDriverHasVehicle(null);
    setDriverTransmission(null);
    setDriverLicenseCategory(null);
    setDriverCategory('');
    setExperienceMin(0);
    setPriceMin(DRIVER_PRICE.min);
    setPriceMax(DRIVER_PRICE.max);
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
          <FilterButton
            active={driverHasVehicle === false}
            onClick={() => setDriverHasVehicle((prev) => (prev === false ? null : false))}
          >
            {t('listing.withoutCar')}
          </FilterButton>
          <FilterButton
            active={driverHasVehicle === true}
            onClick={() => setDriverHasVehicle((prev) => (prev === true ? null : true))}
          >
            {t('listing.withCar')}
          </FilterButton>
          <FilterButton active={availableNow} onClick={() => setAvailableNow((prev) => !prev)}>
            {t('listing.available')}
          </FilterButton>
          <FilterButton active={sort === 'rating'} onClick={() => toggleSort('rating')}>
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
                    priceMin === DRIVER_PRICE_PRESETS[key].min && priceMax === DRIVER_PRICE_PRESETS[key].max
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
              min={DRIVER_PRICE.min}
              max={DRIVER_PRICE.max}
              step={DRIVER_PRICE.step}
              valueMin={priceMin}
              valueMax={priceMax}
              onChange={(nextMin, nextMax) => {
                setPriceMin(nextMin);
                setPriceMax(nextMax);
              }}
              format={compactRwf}
            />
          </FilterSection>

          <FilterSection title={t('filters.experience')}>
            <FilterSlider
              label={t('filters.experience')}
              min={0}
              max={20}
              value={experienceMin}
              onChange={setExperienceMin}
              format={(value) => t('filters.experienceValue', { years: value })}
            />
          </FilterSection>

          <FilterSection title={t('filters.driverCategory')}>
            {DRIVER_CATEGORIES.map((category) => (
              <FilterButton
                key={category}
                active={driverCategory === category}
                onClick={() => setDriverCategory((prev) => (prev === category ? '' : category))}
              >
                {categoryLabel(category)}
              </FilterButton>
            ))}
          </FilterSection>

          {(['Manual', 'Automatic'] as const).map((value) => (
            <FilterButton
              key={value}
              active={driverTransmission === value}
              onClick={() => setDriverTransmission((prev) => (prev === value ? null : value))}
            >
              {value === 'Manual' ? t('listing.manual') : t('listing.automatic')}
            </FilterButton>
          ))}

          <FilterSection title={t('listing.licenseCategory')}>
            {LICENSE_CATEGORIES.map((cat) => (
              <FilterButton
                key={cat}
                active={driverLicenseCategory === cat}
                onClick={() => setDriverLicenseCategory((prev) => (prev === cat ? null : cat))}
              >
                {cat}
              </FilterButton>
            ))}
          </FilterSection>
        </ListingFilterRail>

        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold text-foreground">{t('home.driversInRwanda')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? t('search.loading') : t('search.resultsCount', { count: drivers.length })}
          </p>
          {error ? (
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
          ) : null}

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              [...Array(8)].map((_, i) => <DriverCardSkeleton key={i} />)
            ) : (
              drivers.map((driver) => (
                <DriverListingCard
                  key={driver.id}
                  driver={driver}
                  locale={locale}
                  favorited={driverFavorites.ids.has(driver.id)}
                  onFavoriteChange={(next) => driverFavorites.setFavorited(driver.id, next)}
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

          {!loading && drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <UserRound className="h-10 w-10 text-muted-foreground" />
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
