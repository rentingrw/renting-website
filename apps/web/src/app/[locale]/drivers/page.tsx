'use client';

import { Badge, Card, CardContent, Skeleton } from '@rentingi/ui';
import { Search, UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { AddressInput } from '@/components/web/address-input';
import { LoadingSpinner } from '@/components/web/loading-states';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { searchMarketplace, type DriverCategory, type SearchDriver } from '@/lib/api';
import { formatCurrencyRwf, formatRange, trustTierFromScore } from '@/lib/format';
import { stockImages } from '@/lib/stock-images';

const DRIVER_CATEGORIES: DriverCategory[] = ['city', 'outstation', 'airport', 'chauffeur', 'tour_guide', 'delivery'];
const CATEGORY_LABELS: Record<string, string> = {
  city: 'City', outstation: 'Outstation', airport: 'Airport', chauffeur: 'Chauffeur', tour_guide: 'Tour Guide', delivery: 'Delivery',
};
const PAGE_SIZE = 20;

export default function DriversPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('web');
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [location, setLocation] = useState(searchParams.get('location') ?? 'Kigali');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [driverCategory, setDriverCategory] = useState<DriverCategory | ''>('');
  const [drivers, setDrivers] = useState<SearchDriver[]>([]);
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
          type: 'drivers',
          location,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          driverCategory: driverCategory || undefined,
          limit: PAGE_SIZE,
          offset: 0,
        });
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
  }, [location, latitude, longitude, driverCategory, t]);

  async function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const data = await searchMarketplace({
        type: 'drivers',
        location,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        driverCategory: driverCategory || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setDrivers((prev) => [...prev, ...data.drivers]);
      setOffset(nextOffset);
      setHasMore(Boolean(data.pagination?.hasMoreDrivers));
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
            <select
              value={driverCategory}
              onChange={(e) => setDriverCategory(e.target.value as DriverCategory | '')}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900"
            >
              <option value="">{t('filters.driverCategory')}</option>
              {DRIVER_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {location || 'Kigali'} — {t('tabs.drivers')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? t('search.loading') : t('search.resultsCount', { count: drivers.length })}
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-gray-200 bg-white">
                <div className="flex items-center gap-4 p-4">
                  <Skeleton className="h-20 w-20 shrink-0 rounded-full bg-gray-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4 bg-gray-200" />
                    <Skeleton className="h-4 w-1/2 bg-gray-200" />
                    <Skeleton className="h-5 w-24 bg-gray-200" />
                  </div>
                </div>
              </Card>
            ))
          ) : (
            drivers.map((driver) => (
              <Link key={driver.id} href={`/${locale}/drivers/${driver.id}`}>
                <Card className="overflow-hidden border-gray-200 bg-white shadow-sm transition hover:shadow-md">
                  <CardContent className="flex flex-col items-center p-6 text-center sm:flex-row sm:items-center sm:text-left">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100">
                      <Image
                        src={driver.profilePhotoUrl ?? stockImages.drivers[0]}
                        alt={driver.fullName}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="mt-4 min-w-0 flex-1 sm:mt-0 sm:ml-4">
                      <p className="font-semibold text-gray-900">{driver.fullName}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {driver.primaryCity}
                        {(driver.categories?.length || driver.driverCategory)
                          ? ` · ${(driver.categories?.slice(0, 2).join(', ') || driver.driverCategory?.replace('_', ' ')) ?? ''}`
                          : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <Badge className="bg-teal-50 text-teal-700">
                          {trustTierFromScore(driver.trustScore)}
                        </Badge>
                        <span className="text-sm font-medium text-teal-600">
                          {driver.dailyRateRwf
                            ? formatCurrencyRwf(driver.dailyRateRwf)
                            : driver.approximateRateRangeRwf
                              ? formatRange(
                                  driver.approximateRateRangeRwf.daily.min,
                                  driver.approximateRateRangeRwf.daily.max,
                                )
                              : t('home.priceUnavailable')}{' '}
                          / {t('home.day')}
                        </span>
                      </div>
                    </div>
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

        {!loading && drivers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <UserRound className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{t('search.noResults')}</h3>
            <p className="mt-2 max-w-xs text-sm text-gray-500">{t('search.noResultsHint')}</p>
            <button
              type="button"
              onClick={() => { setLocation(''); setLatitude(null); setLongitude(null); setDriverCategory(''); }}
              className="mt-6 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              {t('search.clearFilters')}
            </button>
          </div>
        )}

        {!loading && !hasMore && drivers.length > 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">{t('search.allResultsShown', { count: drivers.length })}</p>
        )}
      </div>
    </main>
  );
}
