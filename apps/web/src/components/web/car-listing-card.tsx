'use client';

import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { FavoriteButton } from '@/components/web/favorite-button';
import { MediaImage } from '@/components/web/media-image';
import { ShareMenu } from '@/components/web/share-menu';
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
};

export function CarListingCard({
  car,
  locale,
  favorited,
  onFavoriteChange,
  size = 'default',
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
  const medium = size === 'medium';

  return (
    <article
      className={`relative overflow-hidden border border-border bg-card transition ${
        medium
          ? 'rounded-xl shadow-soft-sm hover:shadow-card'
          : 'rounded-2xl shadow-card hover:-translate-y-0.5 hover:shadow-soft'
      }`}
    >
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <FavoriteButton kind="car" id={car.id} favorited={favorited} onChanged={onFavoriteChange} />
        <ShareMenu url={href} title={car.title} />
      </div>
      <Link href={href} className="group block">
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
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-soft-sm sm:text-[11px]">
            {VEHICLE_TYPE_LABELS[car.vehicleType] ?? car.vehicleType}
          </span>
          <span
            className={`absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-[11px] ${
              listingStatus
                ? 'bg-neutral-800 text-white'
                : booked
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {availabilityLabel}
          </span>
        </div>
        <div className={medium ? 'p-3' : 'p-4'}>
          <p className={`font-semibold text-foreground ${medium ? 'text-sm' : ''}`}>
            {car.brand} {car.model}
          </p>
          <p className={`mt-1 text-muted-foreground ${medium ? 'text-xs' : 'text-sm'}`}>
            {car.year} · {car.locationText}
          </p>
          <div className={`${medium ? 'mt-1.5' : 'mt-2'}`}>
            <p className={`font-semibold text-brand ${medium ? 'text-xs' : 'text-sm'}`}>
              {price ?? t('priceOnRequest')}
              <span className="text-xs font-medium text-muted-foreground"> {t('perDay')}</span>
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
