'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { AppRole, OwnerCar } from '@/lib/api';
import type { SupportedLocale } from '@/i18n/routing';

export type CarListingFilter = 'all' | 'active' | 'inactive' | 'booked';

export type DashboardNavKey =
  | 'overview'
  | 'cars'
  | 'cars-active'
  | 'cars-inactive'
  | 'cars-booked'
  | 'taxi'
  | 'bookings'
  | 'driver-profile'
  | 'off';

type DashboardNavProps = {
  locale: SupportedLocale;
  roles: AppRole[];
  hasTaxiProfile?: boolean;
  hasDriverProfile?: boolean;
  active: DashboardNavKey;
};

type NavItem = {
  key: DashboardNavKey;
  href: string;
  labelKey:
    | 'overview'
    | 'cars'
    | 'filterActive'
    | 'filterInactive'
    | 'filterBooked'
    | 'myTaxi'
    | 'bookings'
    | 'driverProfile';
};

function buildNavItems(
  locale: SupportedLocale,
  roles: AppRole[],
  hasTaxiProfile?: boolean,
  hasDriverProfile?: boolean,
): NavItem[] {
  const items: NavItem[] = [
    { key: 'overview', href: `/${locale}/app?section=overview`, labelKey: 'overview' },
    { key: 'bookings', href: `/${locale}/app?section=bookings`, labelKey: 'bookings' },
  ];

  if (roles.includes('car_owner')) {
    items.push({ key: 'cars', href: `/${locale}/app?section=cars`, labelKey: 'cars' });
  }
  if (roles.includes('driver') || hasDriverProfile) {
    items.push({
      key: 'driver-profile',
      href: `/${locale}/app/driver-profile`,
      labelKey: 'driverProfile',
    });
  }
  if (hasTaxiProfile) {
    items.push({ key: 'taxi', href: `/${locale}/app/taxi`, labelKey: 'myTaxi' });
  }

  return items;
}

const linkClass = (active: boolean) =>
  `shrink-0 rounded-md px-3 py-2 text-xs font-bold tracking-wide transition-colors ${
    active
      ? 'bg-brand text-white'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

export function DashboardNav({ locale, roles, hasTaxiProfile, hasDriverProfile, active }: DashboardNavProps) {
  const t = useTranslations('web.app.nav');
  const items = buildNavItems(locale, roles, hasTaxiProfile, hasDriverProfile);

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border bg-card">
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 md:px-8" aria-label="Dashboard navigation">
        {items.map((item) => (
          <Link key={item.key} href={item.href} className={linkClass(active === item.key)}>
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function parseCarListingFilter(filter: string | null): CarListingFilter {
  if (filter === 'active' || filter === 'inactive' || filter === 'booked') return filter;
  return 'all';
}

export function resolveDashboardNavKey(
  pathname: string,
  section: string | null,
  filter: string | null,
  fallback: DashboardNavKey = 'bookings',
): DashboardNavKey {
  if (pathname.includes('/app/settings')) return 'off';
  if (pathname.includes('/app/taxi')) return 'taxi';
  if (pathname.includes('/app/driver-profile')) return 'driver-profile';
  if (section === 'overview' || (!section && pathname.match(/\/app\/?$/))) return 'overview';
  if (section === 'bookings') return 'bookings';
  if (section === 'cars') {
    const f = parseCarListingFilter(filter);
    if (f === 'active') return 'cars-active';
    if (f === 'inactive') return 'cars-inactive';
    if (f === 'booked') return 'cars-booked';
    return 'cars';
  }
  if (pathname.match(/\/app\/?$/)) return 'overview';
  return fallback;
}

export function filterOwnerCars(cars: OwnerCar[], filter: CarListingFilter): OwnerCar[] {
  if (filter === 'all') return cars;
  if (filter === 'active') return cars.filter((car) => car.status === 'active');
  if (filter === 'inactive') {
    return cars.filter((car) => car.status === 'inactive' || car.status === 'paused');
  }
  if (filter === 'booked') return cars.filter((car) => car.status === 'booked');
  return cars;
}
