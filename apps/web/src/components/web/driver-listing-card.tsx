'use client';

import { ArrowRight, MapPin, Navigation } from 'lucide-react';
import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { FavoriteButton } from '@/components/web/favorite-button';
import { InitialsAvatar } from '@/components/web/initials-avatar';
import { ShareMenu } from '@/components/web/share-menu';
import { listingActionChrome } from '@/components/web/listing-action-chrome';
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
  showBookCta?: boolean;
};

export function DriverListingCard({
  driver,
  locale,
  favorited,
  onFavoriteChange,
  size = 'default',
  showBookCta = false,
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
  const avatarSize = medium ? 72 : 88;
  const shellRadius = medium ? 'rounded-xl' : 'rounded-[1.35rem]';

  return (
    <article
      className={`group/card relative flex flex-col overflow-hidden border border-border/80 bg-card transition duration-300 ${shellRadius} ${
        medium ? 'shadow-soft-sm hover:shadow-card' : 'shadow-card hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(20,34,31,0.12)]'
      }`}
    >
      <div className="absolute right-2.5 top-2.5 z-20 flex gap-1.5">
        <FavoriteButton
          kind="driver"
          id={driver.id}
          favorited={favorited}
          onChanged={onFavoriteChange}
          className={listingActionChrome}
        />
        <ShareMenu url={href} title={driver.fullName} className={listingActionChrome} />
      </div>

      <Link href={href} className="flex flex-1 flex-col">
        <div
          className={`relative overflow-hidden bg-gradient-to-br from-ink via-brand to-brand-bright px-4 text-white ${
            medium ? 'pb-4 pt-5' : 'pb-5 pt-6'
          }`}
        >
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <div className="relative flex flex-col items-center">
            <div className="rounded-full bg-gradient-to-br from-sun/80 to-hill/60 p-[3px] shadow-lg">
              <InitialsAvatar
                name={driver.fullName}
                src={driver.profilePhotoUrl}
                size={avatarSize}
                className="!border-[3px] !border-ink"
              />
            </div>
            <p className={`text-center font-extrabold tracking-tight ${medium ? 'mt-2.5 text-sm' : 'mt-3 text-base'}`}>
              {driver.fullName}
            </p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs font-medium text-white/75">
              <MapPin className="h-3 w-3 text-sun" aria-hidden />
              {driver.primaryCity}
            </p>
            {categoryLine ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/90 backdrop-blur-sm">
                <Navigation className="h-3 w-3 text-sun" aria-hidden />
                {categoryLine}
              </span>
            ) : null}
          </div>
          <span
            className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold backdrop-blur-md ${
              booked ? 'bg-amber-400/95 text-amber-950' : 'bg-emerald-400/95 text-emerald-950'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${booked ? 'bg-amber-900' : 'bg-emerald-800'}`} />
            {booked ? t('booked') : t('available')}
          </span>
        </div>

        <div className={`mt-auto flex items-end justify-between gap-3 ${medium ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('perDay')}</p>
            <p className={`font-black text-ink ${medium ? 'text-base' : 'text-lg'}`}>
              {price ?? t('priceOnRequest')}
            </p>
          </div>
        </div>
      </Link>

      {showBookCta ? (
        <div className={`mt-auto ${medium ? 'px-3 pb-3' : 'px-4 pb-4'}`}>
          <Link
            href={href}
            className="group/btn flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#1f4a3f] via-brand to-brand-strong px-4 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:brightness-110"
          >
            {t('bookNow')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" strokeWidth={2.5} />
          </Link>
        </div>
      ) : null}
    </article>
  );
}
