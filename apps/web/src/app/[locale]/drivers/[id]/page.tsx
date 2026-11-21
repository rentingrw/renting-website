'use client';

import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { BookingRequestDialog } from '@/components/web/booking-request-dialog';
import { DriverDetailProfile } from '@/components/web/driver-detail-profile';
import { DriverListingCard } from '@/components/web/driver-listing-card';
import { DriverProfileHero } from '@/components/web/driver-profile-hero';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  getDriverAvailability,
  getDriverById,
  searchMarketplace,
  type DriverDetail,
  type SearchDriver,
} from '@/lib/api';
import { formatCurrencyRwf } from '@/lib/format';

type DriverPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function DetailSkeleton({ locale }: { locale: SupportedLocale }) {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-6 md:px-6">
        <div className="mb-6 h-28 rounded-2xl border border-border bg-muted" />
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="h-64 rounded-2xl bg-muted" />
          <div className="h-56 rounded-2xl bg-muted" />
        </div>
      </div>
    </main>
  );
}

export default function DriverDetailPage({ params }: DriverPageProps) {
  const t = useTranslations('web');
  const { isSignedIn, getToken } = useAuth();
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [driverId, setDriverId] = useState('');
  const [detail, setDetail] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [similar, setSimilar] = useState<SearchDriver[]>([]);
  const [bookedRanges, setBookedRanges] = useState<Array<{ startDate: string; endDate: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      if (!cancelled) {
        if (isSupportedLocale(routeParams.locale)) setLocale(routeParams.locale);
        setDriverId(routeParams.id);
      }
    }
    resolveParams();
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function loadDetails() {
      if (!driverId) return;
      setLoading(true);
      setError(null);
      try {
        const token = isSignedIn ? await getToken() : null;
        const data = await getDriverById(driverId, token ?? undefined);
        const [similarData, availability] = await Promise.all([
          searchMarketplace({ type: 'drivers', location: data.primaryCity, limit: 6 }).catch(() => null),
          getDriverAvailability(driverId, new Date().toISOString().slice(0, 7)).catch(() => null),
        ]);
        if (!cancelled) {
          setDetail(data);
          setBookedRanges(
            (availability?.bookedRanges ?? []).map((item) => ({
              startDate: item.startDate,
              endDate: item.endDate,
            })),
          );
          setSimilar((similarData?.drivers ?? []).filter((item) => item.id !== data.id).slice(0, 6));
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : t('detail.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [driverId, getToken, isSignedIn, t]);

  if (loading) return <DetailSkeleton locale={locale} />;

  if (!detail || error) {
    return (
      <main className="min-h-screen bg-background">
        <AppHeader locale={locale} variant="default" />
        <div className="mx-auto max-w-5xl p-8">
          <p className="rounded-md border-2 border-red-600 bg-red-50 p-4 font-semibold text-red-700">
            {error ?? t('detail.notFound')}
          </p>
        </div>
      </main>
    );
  }

  const bookedNow = Boolean(detail.isBookedNow);
  const bookLabel = bookedNow ? t('detail.unavailable') : t('booking.requestButton');

  const rateRows = [
    detail.dailyRateRwf != null
      ? { label: t('driver.dailyRate'), value: formatCurrencyRwf(detail.dailyRateRwf) }
      : null,
    detail.weeklyRateRwf != null
      ? { label: t('driver.weeklyRate'), value: formatCurrencyRwf(detail.weeklyRateRwf) }
      : null,
    detail.monthlyRateRwf != null
      ? { label: t('driver.monthlyRate'), value: formatCurrencyRwf(detail.monthlyRateRwf) }
      : null,
    detail.hourlyRateRwf != null
      ? { label: t('driver.hourlyRate'), value: formatCurrencyRwf(detail.hourlyRateRwf) }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <DriverProfileHero
          name={detail.fullName}
          photo={detail.profilePhotoUrl}
          profileStatus={detail.status}
          bookedNow={bookedNow}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <DriverDetailProfile detail={detail} bookedRanges={bookedRanges} />

          <div className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-sm font-black text-foreground">{t('driver.rateCard')}</h2>
              {rateRows.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {rateRows.map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/25 px-3 py-2.5"
                    >
                      <span className="text-sm font-semibold text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-black tabular-nums text-brand">{row.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{t('home.priceUnavailable')}</p>
              )}

              {bookedNow ? (
                <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950">
                  {t('detail.bookedNow')}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => setBookingOpen(true)}
                disabled={bookedNow}
                className="mt-4 w-full rounded-full bg-gradient-to-br from-[#1f4a3f] via-brand to-brand-strong py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bookLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      {similar.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-2 md:px-6">
          <h2 className="mb-4 text-lg font-black text-foreground">{t('listing.similarDrivers')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {similar.map((driver) => (
              <DriverListingCard
                key={driver.id}
                driver={driver}
                locale={locale}
                size="medium"
                favorited={false}
                onFavoriteChange={() => undefined}
              />
            ))}
          </div>
        </div>
      ) : null}

      <SiteFooter locale={locale} />

      <BookingRequestDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        target={{
          mode: 'driver',
          id: detail.userId,
          calendarProfileId: detail.id,
          title: detail.fullName,
          ownerLabel: detail.fullName,
          defaultCategory: detail.driverCategory,
          exactDailyRate: detail.dailyRateRwf,
          bookedRanges,
        }}
      />
    </main>
  );
}