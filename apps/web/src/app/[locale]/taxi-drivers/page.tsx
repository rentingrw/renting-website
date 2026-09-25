'use client';

import { Car } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import {
  FilterButton,
  FilterSection,
  FilterSlider,
  ListingFilterRail,
} from '@/components/web/listing-filter-rail';
import { SiteFooter } from '@/components/web/site-footer';
import { TaxiListingCard } from '@/components/web/taxi-listing-card';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';

type TaxiDriversPageProps = {
  params: Promise<{ locale: string }>;
};

type TaxiDriver = {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  seats: number;
  details?: string | null;
  carModel?: string | null;
  vehicleType?: string | null;
  photos?: string[];
  photoUrl?: string | null;
  profilePhotoUrl?: string | null;
};

const CITIES = ['Kigali', 'Musanze', 'Rubavu', 'Huye', 'Karongi', 'Rusizi', 'Muhanga'] as const;
const TAXI_TYPES = ['sedan', 'suv', 'hatchback', 'van'] as const;
const TAXI_TYPE_LABELS: Record<(typeof TAXI_TYPES)[number], string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  hatchback: 'Hatchback',
  van: 'Van',
};

export default function TaxiDriversPage({ params }: TaxiDriversPageProps) {
  const t = useTranslations('web');
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [location, setLocation] = useState('');
  const [seatsMin, setSeatsMin] = useState(1);
  const [vehicleType, setVehicleType] = useState('');
  const [drivers, setDrivers] = useState<TaxiDriver[]>([]);
  const [loading, setLoading] = useState(true);

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
    async function fetchDrivers() {
      setLoading(true);
      try {
        const url = new URL(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/taxi-drivers`);
        if (location.trim()) url.searchParams.set('city', location.trim());
        const res = await fetch(url.toString());
        if (res.ok && !cancelled) {
          const data = await res.json() as TaxiDriver[];
          setDrivers(data);
        }
      } catch {
        // silently fail, show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timeout = setTimeout(() => { void fetchDrivers(); }, location.trim() ? 400 : 0);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [location]);

  const filtered = useMemo(
    () =>
      drivers.filter((taxi) => {
        if (taxi.seats < seatsMin) return false;
        if (vehicleType && (taxi.vehicleType ?? '').toLowerCase() !== vehicleType) return false;
        return true;
      }),
    [drivers, seatsMin, vehicleType],
  );

  function clearFilters() {
    setLocation('');
    setSeatsMin(1);
    setVehicleType('');
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />

      <div className="flex flex-col md:flex-row md:items-start">
        <ListingFilterRail>
          <FilterSection title={t('search.locationPlaceholder')}>
            {CITIES.map((city) => (
              <FilterButton
                key={city}
                active={location === city}
                onClick={() => setLocation((prev) => (prev === city ? '' : city))}
              >
                {city}
              </FilterButton>
            ))}
          </FilterSection>

          <FilterSection title={t('filters.seats')}>
            <FilterSlider
              label={t('filters.seats')}
              min={1}
              max={8}
              value={seatsMin}
              onChange={setSeatsMin}
              format={(value) => t('filters.seatsValue', { count: value })}
            />
          </FilterSection>

          <FilterSection title={t('filters.carType')}>
            {TAXI_TYPES.map((item) => (
              <FilterButton
                key={item}
                active={vehicleType === item}
                onClick={() => setVehicleType((prev) => (prev === item ? '' : item))}
              >
                {TAXI_TYPE_LABELS[item]}
              </FilterButton>
            ))}
          </FilterSection>

          <Link
            href={`/${locale}/onboard/taxi`}
            className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 text-center text-sm font-bold text-ink hover:bg-white/90"
          >
            {t('nav.becomeTaxi')}
          </Link>
        </ListingFilterRail>

        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold text-foreground">{t('tabs.taxi')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? t('search.loading') : t('search.resultsCount', { count: filtered.length })}
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl border border-border bg-muted" />
              ))
            ) : filtered.map((taxi) => (
              <TaxiListingCard key={taxi.id} taxi={taxi} locale={locale} />
            ))}
          </div>

          {!loading && filtered.length === 0 ? (
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
