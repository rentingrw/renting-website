'use client';

import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { FavoriteButton } from '@/components/web/favorite-button';
import { InitialsAvatar } from '@/components/web/initials-avatar';
import { ShareMenu } from '@/components/web/share-menu';
import { TrustBadge } from '@/components/web/trust-badge';
import type { SearchDriver } from '@/lib/api';
import { formatCurrencyRwf, formatRange } from '@/lib/format';
import type { SupportedLocale } from '@/i18n/routing';

type DriverListingCardProps = {
  driver: SearchDriver;
  locale: SupportedLocale;
  favorited: boolean;
  onFavoriteChange: (next: boolean) => void;
};

export function DriverListingCard({ driver, locale, favorited, onFavoriteChange }: DriverListingCardProps) {
  const t = useTranslations('web.listing');
  const href = `/${locale}/drivers/${driver.id}`;
  const price = driver.dailyRateRwf
    ? formatCurrencyRwf(driver.dailyRateRwf)
    : driver.approximateRateRangeRwf
      ? formatRange(driver.approximateRateRangeRwf.daily.min, driver.approximateRateRangeRwf.daily.max)
      : null;
  const booked = Boolean(driver.isBookedNow);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <FavoriteButton kind="driver" id={driver.id} favorited={favorited} onChanged={onFavoriteChange} />
        <ShareMenu url={href} title={driver.fullName} />
      </div>
      <Link href={href} className="group block">
        <div className="flex flex-col items-center border-b border-border bg-brand-soft px-4 py-5">
          <InitialsAvatar name={driver.fullName} src={driver.profilePhotoUrl} size={80} />
          <p className="mt-3 text-center font-semibold text-foreground">{driver.fullName}</p>
          <p className="mt-1 text-center text-xs font-medium text-muted-foreground">
            {driver.primaryCity}
            {(driver.categories?.length || driver.driverCategory)
              ? ` · ${(driver.categories?.slice(0, 2).join(', ') || driver.driverCategory?.replace('_', ' ')) ?? ''}`
              : ''}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 p-4">
          <TrustBadge score={driver.trustScore} />
          <div className="text-right">
            <span
              className={`mb-1 block text-[11px] font-semibold ${
                booked ? 'text-amber-700' : 'text-hill'
              }`}
            >
              {booked ? t('booked') : t('available')}
            </span>
            <span className="text-sm font-semibold text-brand">
              {price ?? t('priceOnRequest')}
              <span className="text-xs font-medium text-muted-foreground"> {t('perDay')}</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
