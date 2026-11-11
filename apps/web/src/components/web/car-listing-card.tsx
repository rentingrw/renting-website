'use client';

import { ArrowRight, MapPin } from 'lucide-react';
import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { FavoriteButton } from '@/components/web/favorite-button';
import { MediaImage } from '@/components/web/media-image';
import { ShareMenu } from '@/components/web/share-menu';
import { listingActionChrome } from '@/components/web/listing-action-chrome';
import type { SearchCar } from '@/lib/api';
import { formatSearchCarDailyPrice } from '@/lib/car-listing-price';
import type { SupportedLocale } from '@/i18n/routing';
import { stockImages } from '@/lib/stock-images';

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  suv: 'SUV',
  sedan: 'Sedan',
  hatchback: 'Hatchback',
  pickup: 'Pickup',
  van: 'Van',
  truck: 'Truck',
};

export type ListingCardSize = 'default' | 'medium';

type CarListingCardProps = {
  car: SearchCar;
  locale: SupportedLocale;
  favorited: boolean;
  onFavoriteChange: (next: boolean) => void;
  /** `medium` — listing pages; `default` — home and marketing grids */
  size?: ListingCardSize;
  /** Show a clear Book now CTA (home featured sections). */
  showBookCta?: boolean;
};

export function CarListingCard({
  car,
  locale,
  favorited,
  onFavoriteChange,
  size = 'default',
  showBookCta = false,
}: CarListingCardProps) {
  const t = useTranslations('web.listing');
  const href = `/${locale}/cars/${car.id}`;
  const price = formatSearchCarDailyPrice(car);
  const photoSrc =
    car.photos?.[0] ??
    stockImages.cars[car.vehicleType as keyof typeof stockImages.cars] ??
    stockImages.carPlaceholder;
  const booked = Boolean(car.isBookedNow);
  const listingStatus = car.status && car.status !== 'active' ? car.status.replace(/_/g, ' ') : null;
  const availabilityLabel = listingStatus ?? (booked ? t('booked') : t('available'));
  const available = !listingStatus && !booked;
  const medium = size === 'medium';
  const shellRadius = medium ? 'rounded-xl' : 'rounded-[1.35rem]';

  return (
    <article
      className={`group/card relative flex flex-col overflow-hidden border border-border/80 bg-card transition duration-300 ${shellRadius} ${
        medium ? 'shadow-soft-sm hover:shadow-card' : 'shadow-card hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(20,34,31,0.12)]'
      }`}
    >
      <div className="absolute right-2.5 top-2.5 z-20 flex gap-1.5">
        <FavoriteButton
          kind="car"
          id={car.id}
          favorited={favorited}
          onChanged={onFavoriteChange}
          className={listingActionChrome}
        />
        <ShareMenu url={href} title={car.title} className={listingActionChrome} />
      </div>

      <Link href={href} className="block flex-1">
        <div className={`relative overflow-hidden bg-muted ${medium ? 'aspect-[5/3]' : 'aspect-[4/3]'}`}>
          <MediaImage
            src={photoSrc}
            alt={car.title}
            fill
            sizes={
              medium
                ? '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw'
                : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
            }
            className="object-cover transition duration-500 group-hover/card:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/5" />

          <div className="absolute left-3 top-3 flex max-w-[calc(100%-5.5rem)] flex-wrap gap-1.5">
            <span className="rounded-full bg-ink/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm sm:text-[11px]">
              {VEHICLE_TYPE_LABELS[car.vehicleType] ?? car.vehicleType}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur-md sm:text-[11px] ${
              listingStatus
                ? 'bg-neutral-900/90 text-white'
                : booked
                  ? 'bg-amber-400/95 text-amber-950'
                  : 'bg-emerald-400/95 text-emerald-950'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                listingStatus ? 'bg-white' : booked ? 'bg-amber-900' : 'bg-emerald-800'
              }`}
            />
            {availabilityLabel}
          </span>
          </div>

          <div className={`absolute inset-x-0 bottom-0 ${medium ? 'p-3' : 'p-4'}`}>
            <p className={`font-extrabold tracking-tight text-white ${medium ? 'text-sm' : 'text-base'}`}>
              {car.brand} {car.model}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-white/75">
              <span className="tabular-nums">{car.year}</span>
              <span className="text-white/40">·</span>
              <MapPin className="h-3 w-3 shrink-0 text-sun" aria-hidden />
              <span className="line-clamp-1">{car.locationText}</span>
            </p>
          </div>
        </div>

        <div className={`flex items-end justify-between gap-3 border-t border-border/60 ${medium ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('perDay')}</p>
            <p className={`font-black text-ink ${medium ? 'text-base' : 'text-lg'}`}>
              {price ?? t('priceOnRequest')}
            </p>
          </div>
          {available ? (
            <span className="hidden shrink-0 rounded-full bg-brand-soft px-2 py-1 text-[10px] font-bold text-brand sm:inline">
              {t('available')}
            </span>
          ) : null}
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