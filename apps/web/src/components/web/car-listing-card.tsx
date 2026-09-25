'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { FavoriteButton } from '@/components/web/favorite-button';
import { ShareMenu } from '@/components/web/share-menu';
import { TrustBadge } from '@/components/web/trust-badge';
import type { SearchCar } from '@/lib/api';
import { formatCurrencyRwf, formatRange } from '@/lib/format';
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

type CarListingCardProps = {
  car: SearchCar;
  locale: SupportedLocale;
  favorited: boolean;
  onFavoriteChange: (next: boolean) => void;
  compact?: boolean;
};

export function CarListingCard({ car, locale, favorited, onFavoriteChange, compact = false }: CarListingCardProps) {
  const t = useTranslations('web.listing');
  const href = `/${locale}/cars/${car.id}`;
  const price = car.dailyRateKigaliRwf
    ? formatCurrencyRwf(car.dailyRateKigaliRwf)
    : car.approximateDailyRateRangeRwf
      ? formatRange(car.approximateDailyRateRangeRwf.kigali.min, car.approximateDailyRateRangeRwf.kigali.max)
      : null;
  const booked = Boolean(car.isBookedNow);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <FavoriteButton kind="car" id={car.id} favorited={favorited} onChanged={onFavoriteChange} />
        <ShareMenu url={href} title={car.title} />
      </div>
      <Link href={href} className="group block">
        <div className={`relative overflow-hidden bg-muted ${compact ? 'h-16 w-24 shrink-0' : 'aspect-[4/3]'}`}>
          <Image
            src={car.photos?.[0] ?? stockImages.carPlaceholder}
            alt={car.title}
            fill
            sizes={compact ? '96px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground shadow-soft-sm">
            {VEHICLE_TYPE_LABELS[car.vehicleType] ?? car.vehicleType}
          </span>
          <span
            className={`absolute bottom-2 left-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              booked ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {booked ? t('booked') : t('available')}
          </span>
        </div>
        <div className="p-4">
          <p className="font-semibold text-foreground">{car.brand} {car.model}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {car.year} · {car.locationText}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-brand">
              {price ?? t('priceOnRequest')}
              <span className="text-xs font-medium text-muted-foreground"> {t('perDay')}</span>
            </p>
            {car.ownerTrustScore != null ? <TrustBadge score={car.ownerTrustScore} verified={car.verified} /> : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
