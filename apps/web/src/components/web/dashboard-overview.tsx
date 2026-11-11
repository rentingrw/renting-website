'use client';

import Link from 'next/link';
import { Car, CarTaxiFront, ChevronRight, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@rentingi/ui';

import { MediaImage } from '@/components/web/media-image';
import type { DriverProfileFull, MeResponse, OwnerCar, TaxiDriverMe } from '@/lib/api';
import { formatCurrencyRwf } from '@/lib/format';
import type { SupportedLocale } from '@/i18n/routing';
import { stockImages } from '@/lib/stock-images';

export type OverviewBooking = {
  key: string;
  title: string;
  status: string;
  startAt: string;
  amountRwf: number;
};

type DashboardOverviewProps = {
  locale: SupportedLocale;
  profile: MeResponse;
  cars: OwnerCar[];
  bookings: OverviewBooking[];
  driverProfile: DriverProfileFull | null;
  taxiProfile: TaxiDriverMe | null;
  onOpenBookings: () => void;
  onOpenCars: () => void;
  onNewListing?: () => void;
};

function countCarsByBucket(cars: OwnerCar[]) {
  return {
    active: cars.filter((c) => c.status === 'active').length,
    hidden: cars.filter((c) => c.status === 'inactive' || c.status === 'paused' || c.status === 'booked').length,
    draft: cars.filter((c) => ['draft', 'pending_approval', 'rejected'].includes(c.status)).length,
  };
}

function statusBadgeClass(status: string): string {
  if (status === 'active' || status === 'approved') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'pending' || status === 'pending_approval') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (status === 'booked' || status === 'confirmed') return 'bg-sky-50 text-sky-800 border-sky-200';
  if (status === 'rejected' || status === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-muted text-muted-foreground border-border';
}

function formatStatusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}

export function DashboardOverview({
  locale,
  profile,
  cars,
  bookings,
  driverProfile,
  taxiProfile,
  onOpenBookings,
  onOpenCars,
  onNewListing,
}: DashboardOverviewProps) {
  const t = useTranslations('web.app.overview');
  const isCarOwner = profile.roles.includes('car_owner');
  const isDriver = profile.roles.includes('driver') || profile.hasDriverProfile;
  const isTaxi = Boolean(profile.hasTaxiProfile || taxiProfile);

  const carBuckets = countCarsByBucket(cars);
  const previewCars = cars.slice(0, 4);
  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
  const activeBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'active').length;
  const previewBookings = bookings.slice(0, 4);

  const showAssetSections = isCarOwner || isDriver || isTaxi;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={onOpenBookings}
          className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-brand/40"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('bookingsTitle')}</p>
          <p className="mt-2 text-2xl font-black text-foreground">{bookings.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pendingBookings > 0 ? t('pendingBookings', { count: pendingBookings }) : t('upcomingBookings', { count: activeBookings })}
          </p>
        </button>

        {isCarOwner ? (
          <button
            type="button"
            onClick={onOpenCars}
            className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-brand/40"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('carsTitle')}</p>
            <p className="mt-2 text-2xl font-black text-foreground">{cars.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {carBuckets.active} {t('statsActive').toLowerCase()} · {carBuckets.draft} {t('statsDraft').toLowerCase()}
            </p>
          </button>
        ) : null}

        {isDriver ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('driverTitle')}</p>
            <p className="mt-2 text-lg font-black capitalize text-foreground">
              {driverProfile ? formatStatusLabel(driverProfile.status ?? 'draft') : t('noDriverShort')}
            </p>
            {driverProfile ? (
              <p className="mt-1 text-xs text-muted-foreground">{driverProfile.primaryCity}</p>
            ) : null}
          </div>
        ) : null}

        {isTaxi ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('taxiTitle')}</p>
            <p className="mt-2 text-lg font-black capitalize text-foreground">
              {taxiProfile ? formatStatusLabel(taxiProfile.status) : t('noTaxiShort')}
            </p>
            {taxiProfile ? (
              <p className="mt-1 text-xs text-muted-foreground">{taxiProfile.city}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {!showAssetSections && bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t('renterEmpty')}</p>
          <Link
            href={`/${locale}`}
            className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            {t('searchMarketplace')}
          </Link>
        </div>
      ) : null}

      {bookings.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-foreground">{t('bookingsTitle')}</h2>
            <button type="button" onClick={onOpenBookings} className="text-xs font-bold text-brand hover:underline">
              {t('viewAll')}
            </button>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {previewBookings.map((booking) => (
              <button
                key={booking.key}
                type="button"
                onClick={onOpenBookings}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{booking.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(booking.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}
                    {formatCurrencyRwf(booking.amountRwf)}
                  </p>
                </div>
                <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold capitalize ${statusBadgeClass(booking.status)}`}>
                  {formatStatusLabel(booking.status)}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {isCarOwner ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-brand" aria-hidden />
              <h2 className="text-base font-bold text-foreground">{t('carsTitle')}</h2>
            </div>
            <div className="flex items-center gap-2">
              {onNewListing ? (
                <Button size="sm" variant="outline" onClick={onNewListing}>
                  {t('addCar')}
                </Button>
              ) : null}
              <button type="button" onClick={onOpenCars} className="inline-flex items-center gap-0.5 text-xs font-bold text-brand hover:underline">
                {t('manage')}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {cars.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">{t('noCars')}</p>
              <Link href={`/${locale}/onboard/car`} className="mt-3 inline-block text-sm font-bold text-brand hover:underline">
                {t('addCar')}
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
                  {t('statsActive')}: {carBuckets.active}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">
                  {t('statsHidden')}: {carBuckets.hidden}
                </span>
                {carBuckets.draft > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
                    {t('statsDraft')}: {carBuckets.draft}
                  </span>
                ) : null}
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {previewCars.map((car) => {
                  const photo =
                    car.photos?.[0] ??
                    stockImages.cars[car.vehicleType as keyof typeof stockImages.cars] ??
                    stockImages.carPlaceholder;
                  return (
                    <Link
                      key={car.id}
                      href={`/${locale}/cars/${car.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                    >
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                        <MediaImage src={photo} alt="" fill className="object-cover" sizes="64px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{car.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrencyRwf(car.dailyRateInCityRwf)} / day
                        </p>
                      </div>
                      <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold capitalize ${statusBadgeClass(car.status)}`}>
                        {formatStatusLabel(car.status)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </section>
      ) : null}

      {isDriver ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-brand" aria-hidden />
              <h2 className="text-base font-bold text-foreground">{t('driverTitle')}</h2>
            </div>
            <Link
              href={`/${locale}/app/driver-profile`}
              className="inline-flex items-center gap-0.5 text-xs font-bold text-brand hover:underline"
            >
              {driverProfile ? t('manage') : t('addDriver')}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {driverProfile ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{driverProfile.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {driverProfile.primaryCity} · {driverProfile.yearsExperience} yrs · {formatCurrencyRwf(driverProfile.dailyRateRwf)}/day
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground capitalize">
                    {formatStatusLabel(driverProfile.status ?? 'draft')}
                    {driverProfile.completedTrips > 0 ? ` · ${driverProfile.completedTrips} trips` : ''}
                  </p>
                </div>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold capitalize ${statusBadgeClass(driverProfile.status ?? 'draft')}`}>
                  {formatStatusLabel(driverProfile.status ?? 'draft')}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{t('driverPending', { count: driverProfile.bookingStats.pending })}</span>
                <span>·</span>
                <span>{t('driverActive', { count: driverProfile.bookingStats.active })}</span>
                <span>·</span>
                <span>{t('driverCompleted', { count: driverProfile.bookingStats.completed })}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">{t('noDriver')}</p>
              <Link href={`/${locale}/onboard/driver`} className="mt-3 inline-block text-sm font-bold text-brand hover:underline">
                {t('addDriver')}
              </Link>
            </div>
          )}
        </section>
      ) : null}

      {isTaxi ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CarTaxiFront className="h-4 w-4 text-brand" aria-hidden />
              <h2 className="text-base font-bold text-foreground">{t('taxiTitle')}</h2>
            </div>
            <Link
              href={`/${locale}/app/taxi`}
              className="inline-flex items-center gap-0.5 text-xs font-bold text-brand hover:underline"
            >
              {taxiProfile ? t('manage') : t('addTaxi')}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {taxiProfile ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold text-foreground">{taxiProfile.fullName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {taxiProfile.workLocationText ?? taxiProfile.city}
                {taxiProfile.carModel ? ` · ${taxiProfile.carModel}` : ''}
                {taxiProfile.plate ? ` · ${taxiProfile.plate}` : ''}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded border px-2 py-0.5 font-bold capitalize ${statusBadgeClass(taxiProfile.status)}`}>
                  {formatStatusLabel(taxiProfile.status)}
                </span>
                <span className="text-muted-foreground">{taxiProfile.seats} seats</span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">{t('noTaxi')}</p>
              <Link href={`/${locale}/onboard/taxi`} className="mt-3 inline-block text-sm font-bold text-brand hover:underline">
                {t('addTaxi')}
              </Link>
            </div>
          )}
        </section>
      ) : null}

      {profile.hosterProfile?.companyName || profile.hosterProfile?.workAddress ? (
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('hostProfile')}</p>
          {profile.hosterProfile.companyName ? (
            <p className="mt-1 text-sm font-semibold text-foreground">{profile.hosterProfile.companyName}</p>
          ) : null}
          {profile.hosterProfile.workAddress ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{profile.hosterProfile.workAddress}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
