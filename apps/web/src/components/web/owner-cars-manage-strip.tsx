'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { OwnerDashboardCarList } from '@/components/web/owner-dashboard-car-card';
import { getCarsMine, getMe, setCarListingStatus, type CarMarketplaceVisibility, type OwnerCar } from '@/lib/api';
import type { SupportedLocale } from '@/i18n/routing';

function marketplaceValue(car: OwnerCar): CarMarketplaceVisibility | '' {
  if (car.status === 'active') return 'active';
  if (car.status === 'booked') return 'booked';
  if (car.status === 'inactive' || car.status === 'paused') return 'inactive';
  return '';
}

function canSetVisibility(car: OwnerCar): boolean {
  return (
    car.status === 'active' ||
    car.status === 'inactive' ||
    car.status === 'booked' ||
    car.status === 'paused'
  );
}

type OwnerCarsManageStripProps = {
  locale: SupportedLocale;
};

/** Shown on public /cars for signed-in hosts — compact rows, visibility control only. */
export function OwnerCarsManageStrip({ locale }: OwnerCarsManageStripProps) {
  const t = useTranslations('web');
  const { isSignedIn, getToken } = useAuth();
  const [cars, setCars] = useState<OwnerCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setCars([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) return;
        const me = await getMe(token);
        if (!me?.roles.includes('car_owner')) {
          if (!cancelled) setCars([]);
          return;
        }
        const mine = await getCarsMine(token);
        if (!cancelled) setCars(mine);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your listings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  if (!isSignedIn || loading || (cars.length === 0 && !error)) return null;

  async function onStatusChange(car: OwnerCar, status: CarMarketplaceVisibility) {
    const token = await getToken();
    if (!token) return;
    await setCarListingStatus(token, car.id, status);
    const mine = await getCarsMine(token);
    setCars(mine);
  }

  const labels = {
    edit: t('app.actions.edit'),
    publish: t('app.actions.publish'),
    statusActive: t('app.cars.statusActive'),
    statusInactive: t('app.cars.statusInactive'),
    statusBooked: t('app.cars.statusBooked'),
    pendingApproval: t('app.cars.pendingApproval'),
    viewListing: t('app.cars.viewListing'),
  };

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">{t('app.cars.manageStripTitle')}</h2>
          <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">{t('app.cars.manageStripHint')}</p>
        </div>
        <Link
          href={`/${locale}/app?section=cars`}
          className="inline-flex shrink-0 items-center rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground transition hover:border-brand/40 hover:text-brand"
        >
          {t('app.cars.openDashboard')}
        </Link>
      </div>
      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <OwnerDashboardCarList
        cars={cars}
        locale={locale}
        labels={labels}
        marketplaceValueFor={marketplaceValue}
        canPickMarketplaceStatus={canSetVisibility}
        onEdit={() => {}}
        onStatusChange={(car, status) => void onStatusChange(car, status)}
        onPublish={() => {}}
        statusOnly
      />
    </section>
  );
}
