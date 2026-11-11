'use client';

import { Car, Phone } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { InitialsAvatar } from '@/components/web/initials-avatar';
import { ShareMenu } from '@/components/web/share-menu';
import type { SupportedLocale } from '@/i18n/routing';
import type { ListingCardSize } from '@/components/web/car-listing-card';

export type TaxiCardData = {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  seats: number;
  carModel?: string | null;
  vehicleType?: string | null;
  photos?: string[];
  photoUrl?: string | null;
  profilePhotoUrl?: string | null;
};

type TaxiListingCardProps = {
  taxi: TaxiCardData;
  locale: SupportedLocale;
  size?: ListingCardSize;
};

export function TaxiListingCard({ taxi, locale, size = 'default' }: TaxiListingCardProps) {
  const t = useTranslations('web.listing');
  const href = `/${locale}/taxi-drivers/${taxi.id}`;
  const photo = taxi.profilePhotoUrl ?? taxi.photoUrl ?? taxi.photos?.[0] ?? null;
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
      <div className="absolute right-2 top-2 z-10">
        <ShareMenu
          url={href}
          title={taxi.fullName}
          text={`${taxi.fullName} — taxi in ${taxi.city}. Call ${taxi.phone}.`}
        />
      </div>
      <Link href={href} className="group block">
        <div
          className={`flex flex-col items-center border-b border-border bg-red-50 px-4 ${
            medium ? 'py-4' : 'py-5'
          }`}
        >
          <InitialsAvatar name={taxi.fullName} src={photo} size={avatarSize} />
          <p className={`text-center font-semibold text-foreground ${medium ? 'mt-2 text-sm' : 'mt-3'}`}>
            {taxi.fullName}
          </p>
          <p className="mt-1 text-center text-xs font-medium text-muted-foreground">
            {taxi.city}
            {taxi.carModel ? ` · ${taxi.carModel}` : ''}
          </p>
        </div>
        <div className={`flex items-center justify-between gap-2 ${medium ? 'p-3' : 'p-4'}`}>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Car className="h-3.5 w-3.5 text-red-600" />
            {taxi.seats} seats
          </span>
          <span className={`inline-flex items-center gap-1 font-semibold text-red-700 ${medium ? 'text-xs' : 'text-sm'}`}>
            <Phone className="h-3.5 w-3.5" />
            {t('contact')}
          </span>
        </div>
      </Link>
    </article>
  );
}
