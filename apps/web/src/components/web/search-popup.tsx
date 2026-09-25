'use client';

import { Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle } from '@rentingi/ui';
import { Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
  searchMarketplace,
  type SearchCar,
  type SearchDriver,
  type SearchTaxi,
  type SearchType,
} from '@/lib/api';
import { formatCurrencyRwf, formatRange } from '@/lib/format';
import { stockImages } from '@/lib/stock-images';
import type { SupportedLocale } from '@/i18n/routing';
import { InitialsAvatar } from '@/components/web/initials-avatar';
import { TrustBadge } from '@/components/web/trust-badge';
import { LoadingSpinner, SearchPopupLoadingSkeleton } from '@/components/web/loading-states';

type SearchPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: SupportedLocale;
};

const PAGE_SIZE = 12;

export function SearchPopup({ open, onOpenChange, locale }: SearchPopupProps) {
  const t = useTranslations('web');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>('all');
  const [cars, setCars] = useState<SearchCar[]>([]);
  const [drivers, setDrivers] = useState<SearchDriver[]>([]);
  const [taxis, setTaxis] = useState<SearchTaxi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const trimmed = query.trim();
      const params: Parameters<typeof searchMarketplace>[0] = {
        type,
        location: trimmed || undefined,
        limit: PAGE_SIZE,
        offset: 0,
      };
      if (trimmed) {
        params.query = trimmed;
      }
      const data = await searchMarketplace(params);
      setCars(data.cars);
      setDrivers(data.drivers);
      setTaxis(data.taxis ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('search.error'));
      setCars([]);
      setDrivers([]);
      setTaxis([]);
    } finally {
      setLoading(false);
    }
  }, [query, type, t]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const trimmed = query.trim();
    const params: Parameters<typeof searchMarketplace>[0] = {
      type,
      location: trimmed || undefined,
      limit: PAGE_SIZE,
      offset: 0,
    };
    if (trimmed) {
      params.query = trimmed;
    }
    setLoading(true);
    setSearched(true);
    searchMarketplace(params)
      .then((data) => {
        setCars(data.cars);
        setDrivers(data.drivers);
        setTaxis(data.taxis ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('search.error'));
        setCars([]);
        setDrivers([]);
        setTaxis([]);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when popup opens
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  const includeCars = type === 'all' || type === 'cars';
  const includeDrivers = type === 'all' || type === 'drivers';
  const includeTaxis = type === 'all' || type === 'taxis';
  const totalCount =
    (includeCars ? cars.length : 0) +
    (includeDrivers ? drivers.length : 0) +
    (includeTaxis ? taxis.length : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-hidden border-border bg-card p-0 sm:max-h-[85vh]">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="text-lg text-foreground">{t('app.cta.findTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="border-b border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  const next = e.target.value;
                  setQuery(next);
                  if (!next.trim()) {
                    setCars([]);
                    setDrivers([]);
                    setTaxis([]);
                    setError(null);
                    setSearched(true);
                    setLoading(true);
                    searchMarketplace({
                      type,
                      location: undefined,
                      limit: PAGE_SIZE,
                      offset: 0,
                    })
                      .then((data) => {
                        setCars(data.cars);
                        setDrivers(data.drivers);
                        setTaxis(data.taxis ?? []);
                      })
                      .catch((err) => {
                        setError(err instanceof Error ? err.message : t('search.error'));
                        setCars([]);
                        setDrivers([]);
                        setTaxis([]);
                      })
                      .finally(() => setLoading(false));
                  }
                }}
                placeholder={t('search.locationPlaceholder')}
                className="w-full rounded-lg border border-gray-300 bg-card py-2.5 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SearchType)}
              className="h-10 rounded-lg border border-gray-300 bg-card px-3 text-sm text-foreground focus:border-sky-500 focus:outline-none"
            >
              <option value="all">{t('tabs.all')}</option>
              <option value="cars">{t('tabs.cars')}</option>
              <option value="drivers">{t('tabs.drivers')}</option>
              <option value="taxis">{t('tabs.taxi')}</option>
            </select>
            <Button type="submit" disabled={loading} className="bg-brand hover:bg-brand-hover">
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner className="h-4 w-4" />
                  {t('search.loading')}
                </span>
              ) : (
                t('app.cta.searchButton')
              )}
            </Button>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : !searched ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('app.cta.findSubtitle')}</p>
          ) : loading ? (
            <SearchPopupLoadingSkeleton />
          ) : totalCount === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('search.resultsCount', { count: 0 })}</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t('search.resultsCount', { count: totalCount })}</p>
              {includeCars &&
                cars.map((car) => (
                  <Link
                    key={car.id}
                    href={`/${locale}/cars/${car.id}`}
                    onClick={() => onOpenChange(false)}
                  >
                    <Card className="overflow-hidden border-border bg-card shadow-sm transition hover:border-sky-500/50 hover:shadow-md">
                      <CardContent className="flex gap-3 p-3">
                        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-gray-100">
                          <Image
                            src={car.photos?.[0] ?? stockImages.carPlaceholder}
                            alt=""
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{car.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {car.locationText} • {car.vehicleType}
                          </p>
                          <p className="mt-1 text-sm font-medium text-brand">
                            {car.dailyRateKigaliRwf
                              ? formatCurrencyRwf(car.dailyRateKigaliRwf)
                              : car.approximateDailyRateRangeRwf
                                ? formatRange(
                                    car.approximateDailyRateRangeRwf.kigali.min,
                                    car.approximateDailyRateRangeRwf.kigali.max,
                                  )
                                : t('home.priceUnavailable')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              {includeDrivers &&
                drivers.map((driver) => (
                  <Link
                    key={driver.id}
                    href={`/${locale}/drivers/${driver.id}`}
                    onClick={() => onOpenChange(false)}
                  >
                    <Card className="overflow-hidden border-border bg-card shadow-sm transition hover:border-sky-500/50 hover:shadow-md">
                      <CardContent className="flex gap-3 p-3">
                        <InitialsAvatar name={driver.fullName} src={driver.profilePhotoUrl} size={64} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{driver.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {driver.primaryCity} • {driver.categories.slice(0, 2).join(' • ')}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <TrustBadge score={driver.trustScore} />
                            <span className="text-sm font-medium text-brand">
                              {driver.dailyRateRwf
                                ? formatCurrencyRwf(driver.dailyRateRwf)
                                : driver.approximateRateRangeRwf
                                  ? formatRange(
                                      driver.approximateRateRangeRwf.daily.min,
                                      driver.approximateRateRangeRwf.daily.max,
                                    )
                                  : t('home.priceUnavailable')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              {includeTaxis &&
                taxis.map((taxi) => (
                  <Link
                    key={taxi.id}
                    href={`/${locale}/taxi-drivers/${taxi.id}`}
                    onClick={() => onOpenChange(false)}
                  >
                    <Card className="overflow-hidden border-border bg-card shadow-sm transition hover:border-red-500/50 hover:shadow-md">
                      <CardContent className="flex gap-3 p-3">
                        <InitialsAvatar
                          name={taxi.fullName}
                          src={taxi.profilePhotoUrl ?? taxi.photoUrl ?? taxi.photos?.[0] ?? null}
                          size={64}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{taxi.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {taxi.city}
                            {taxi.carModel ? ` • ${taxi.carModel}` : ''}
                            {taxi.seats ? ` • ${taxi.seats} seats` : ''}
                          </p>
                          <p className="mt-1 text-sm font-medium text-red-300">{taxi.phone}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
