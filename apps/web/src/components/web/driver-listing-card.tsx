'use client';

import { ArrowRight, BriefcaseBusiness, MapPinned } from 'lucide-react';
import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { DriverProfilePhoto } from '@/components/web/driver-profile-photo';
import { FavoriteButton } from '@/components/web/favorite-button';
import { ShareMenu } from '@/components/web/share-menu';
import { listingActionChrome } from '@/components/web/listing-action-chrome';
import type { SearchDriver } from '@/lib/api';
import { driverLeadPrice, driverPublicAreas, isDriverVerified } from '@/lib/driver-listing-price';
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
  const verified = driver.verified ?? isDriverVerified(driver.status);
  const lead = driverLeadPrice(driver);
  const booked = Boolean(driver.isBookedNow);
  const medium = size === 'medium';
  const shellRadius = medium ? 'rounded-xl' : 'rounded-2xl';
  const areasLabel = driverPublicAreas(driver);

  return (
    <article
      className={`group/card relative flex flex-col overflow-hidden border border-border/80 bg-card transition duration-300 ${shellRadius} ${
        medium ? 'shadow-soft-sm hover:shadow-card' : 'shadow-card hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(20,34,31,0.1)]'
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
        <DriverProfilePhoto
          name={driver.fullName}
          photoUrl={driver.profilePhotoUrl}
          variant="card"
          verified={verified}
        />

        {booked ? (
          <span className="absolute left-3 top-12 z-10 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-bold text-amber-950">
            {t('booked')}
          </span>
        ) : null}

        <div className={`flex flex-1 flex-col ${medium ? 'px-3.5 py-3' : 'px-4 py-3.5'}`}>
          <span className="inline-flex w-fit rounded-full bg-sun/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-sun">
            {t('driverService')}
          </span>

          <p className={`mt-2 font-black text-ink ${medium ? 'text-sm' : 'text-base'}`}>{driver.fullName}</p>

          {verified ? (
            <span className="mt-2 inline-flex w-fit rounded-full bg-brand/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand">
              {t('verified')}
            </span>
          ) : null}

          <div className="mt-2.5 flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-ink/80">
              <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0 text-sun" strokeWidth={2.25} />
              {t('yearsExp', { count: driver.yearsExperience })}
            </span>
            {areasLabel ? (
              <span className="inline-flex items-start gap-1.5 line-clamp-2">
                <MapPinned className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2.25} />
                {areasLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-auto border-t border-border/80 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t('priceFrom')}</p>
            <p className={`font-black tabular-nums text-sun ${medium ? 'text-lg' : 'text-xl'}`}>
              {lead ? (
                <>
                  {lead.amount}
                  <span className="ml-1 text-sm font-bold text-muted-foreground">
                    {lead.unit === 'hour' ? t('perHour') : t('perDay')}
                  </span>
                </>
              ) : (
                <span className="text-base text-muted-foreground">{t('priceOnRequest')}</span>
              )}
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