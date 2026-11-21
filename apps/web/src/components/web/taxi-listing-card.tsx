'use client';

import { ArrowRight, Phone, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { InitialsAvatar } from '@/components/web/initials-avatar';
import { MediaImage } from '@/components/web/media-image';
import { ShareMenu } from '@/components/web/share-menu';
import { listingActionChrome } from '@/components/web/listing-action-chrome';
import type { SupportedLocale } from '@/i18n/routing';
import type { ListingCardSize } from '@/components/web/car-listing-card';
import { taxiCarPhotos } from '@/lib/taxi-photos';

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
  showContactCta?: boolean;
};

export function TaxiListingCard({ taxi, locale, size = 'default', showContactCta = false }: TaxiListingCardProps) {
  const t = useTranslations('web.listing');
  const href = `/${locale}/taxi-drivers/${taxi.id}`;
  const carPhoto = taxiCarPhotos(taxi)[0] ?? null;
  const profilePhoto = taxi.profilePhotoUrl ?? null;
  const medium = size === 'medium';
  const avatarSize = medium ? 52 : 60;
  const shellRadius = medium ? 'rounded-xl' : 'rounded-[1.35rem]';

  return (
    <article
      className={`group/card relative flex flex-col overflow-hidden border border-border/80 bg-card transition duration-300 ${shellRadius} ${
        medium ? 'shadow-soft-sm hover:shadow-card' : 'shadow-card hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(20,34,31,0.12)]'
      }`}
    >
      <div className="absolute right-2.5 top-2.5 z-20">
        <ShareMenu
          url={href}
          title={taxi.fullName}
          text={`${taxi.fullName} — taxi in ${taxi.city}. Call ${taxi.phone}.`}
          className={listingActionChrome}
        />
      </div>

      <Link href={href} className="flex flex-1 flex-col">
        <div className={`relative w-full overflow-hidden bg-muted ${medium ? 'aspect-[5/3]' : 'aspect-[16/10]'}`}>
          {carPhoto ? (
            <MediaImage
              src={carPhoto}
              alt=""
              fill
              sizes="(max-width:640px) 100vw, 360px"
              className="object-cover transition duration-500 group-hover/card:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted via-brand-soft to-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10" />

          <span className="absolute left-3 top-3 z-10 rounded-full bg-sun px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-ink shadow-sm">
            Taxi
          </span>

          <div className="absolute inset-x-0 bottom-0 z-10 flex items-end gap-3 p-3 sm:p-4">
            <div className="shrink-0 rounded-full ring-2 ring-white/90 shadow-md">
              <InitialsAvatar name={taxi.fullName} src={profilePhoto} size={avatarSize} className="!border-[2px] !border-white" />
            </div>
            <div className="min-w-0 pb-0.5 text-white">
              <p className={`truncate font-extrabold tracking-tight ${medium ? 'text-sm' : 'text-base'}`}>{taxi.fullName}</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-white/85">
                {taxi.city}
                {taxi.carModel ? ` · ${taxi.carModel}` : taxi.vehicleType ? ` · ${taxi.vehicleType.replace(/_/g, ' ')}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className={`mt-auto flex items-center justify-between gap-2 ${medium ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-foreground">
            <Users className="h-3.5 w-3.5 text-hill" aria-hidden />
            {taxi.seats} seats
          </span>
          <span className={`inline-flex items-center gap-1.5 font-bold text-ink ${medium ? 'text-xs' : 'text-sm'}`}>
            <Phone className="h-3.5 w-3.5" />
            {t('contact')}
          </span>
        </div>
      </Link>

      {showContactCta ? (
        <div className={`mt-auto ${medium ? 'px-3 pb-3' : 'px-4 pb-4'}`}>
          <Link
            href={href}
            className="group/btn flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-hover"
          >
            {t('contact')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" strokeWidth={2.5} />
          </Link>
        </div>
      ) : null}
    </article>
  );
}