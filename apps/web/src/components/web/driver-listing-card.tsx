'use client';

import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { FavoriteButton } from '@/components/web/favorite-button';
import { InitialsAvatar } from '@/components/web/initials-avatar';
import { ShareMenu } from '@/components/web/share-menu';
import type { SearchDriver } from '@/lib/api';
import { formatCurrencyRwf, formatRange } from '@/lib/format';
import type { SupportedLocale } from '@/i18n/routing';
import type { ListingCardSize } from '@/components/web/car-listing-card';

type DriverListingCardProps = {
  driver: SearchDriver;
  locale: SupportedLocale;
  favorited: boolean;
  onFavoriteChange: (next: boolean) => void;
  size?: ListingCardSize;
};

export function DriverListingCard({
  driver,
  locale,
  favorited,
  onFavoriteChange,
  size = 'default',
}: DriverListingCardProps) {
  const t = useTranslations('web.listing');
  const href = `/${locale}/drivers/${driver.id}`;
  const price = driver.dailyRateRwf
    ? formatCurrencyRwf(driver.dailyRateRwf)
    : driver.approximateRateRangeRwf
      ? formatRange(driver.approximateRateRangeRwf.daily.min, driver.approximateRateRangeRwf.daily.max)
      : null;
  const booked = Boolean(driver.isBookedNow);
  const categoryLine =
    (driver.categories?.length || driver.driverCategory)
      ? (driver.categories?.slice(0, 2).join(', ') || driver.driverCategory?.replace('_', ' ')) ?? ''
      : '';
  const medium = size === 'medium';
  const avatarSize = medium ? 64 : 80;

  return (
    <article
      className={`relative overflow-hidden border border-border bg-card transition ${
        medium
          ? 'rounded-xl shadow-soft-sm hover:shadow-card'
          : 'rounded-2xl shadow-card hover:-translate-y-0.5 hover:shadow-soft'
      }`}
    >
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <FavoriteButton kind="driver" id={driver.id} favorited={favorited} onChanged={onFavoriteChange} />
        <ShareMenu url={href} title={driver.fullName} />
      </div>
      <Link href={href} className="group block">
        <div
          className={`flex flex-col items-center border-b border-border bg-brand-soft px-4 ${
            medium ? 'py-4' : 'py-5'
          }`}
        >
          <InitialsAvatar name={driver.fullName} src={driver.profilePhotoUrl} size={avatarSize} />
          <p className={`text-center font-semibold text-foreground ${medium ? 'mt-2 text-sm' : 'mt-3'}`}>
            {driver.fullName}
          </p>
          <p className="mt-1 text-center text-xs font-medium text-muted-foreground">
            {driver.primaryCity}
            {categoryLine ? ` · ${categoryLine}` : ''}
          </p>
        </div>
        <div className={`flex items-center justify-end gap-2 ${medium ? 'p-3' : 'p-4'}`}>
          <div className="text-right">
            <span
              className={`mb-1 block font-semibold ${
                medium ? 'text-[10px]' : 'text-[11px]'
              } ${booked ? 'text-amber-700' : 'text-hill'}`}
            >
              {booked ? t('booked') : t('available')}
            </span>
            <span className={`font-semibold text-brand ${medium ? 'text-xs' : 'text-sm'}`}>
              {price ?? t('priceOnRequest')}
              <span className="text-xs font-medium text-muted-foreground"> {t('perDay')}</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
