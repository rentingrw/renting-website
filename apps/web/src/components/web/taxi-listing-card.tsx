'use client';

import { ArrowRight, Car, Phone, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { InitialsAvatar } from '@/components/web/initials-avatar';
import { ShareMenu } from '@/components/web/share-menu';
import { listingActionChrome } from '@/components/web/listing-action-chrome';
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
  showContactCta?: boolean;
};

export function TaxiListingCard({ taxi, locale, size = 'default', showContactCta = false }: TaxiListingCardProps) {
  const t = useTranslations('web.listing');
  const href = `/${locale}/taxi-drivers/${taxi.id}`;
  const photo = taxi.profilePhotoUrl ?? taxi.photoUrl ?? taxi.photos?.[0] ?? null;
  const medium = size === 'medium';
  const avatarSize = medium ? 72 : 88;
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
        <div
          className={`relative overflow-hidden bg-gradient-to-br from-sun via-[#e7b93a] to-[#f0d060] px-4 text-ink ${
            medium ? 'pb-4 pt-5' : 'pb-5 pt-6'
          }`}
        >
          <Car
            className="pointer-events-none absolute -bottom-6 -right-4 h-28 w-28 text-ink/10"
            strokeWidth={1.25}
            aria-hidden
          />
          <div className="relative flex flex-col items-center">
            <div className="rounded-full bg-ink/10 p-[3px] shadow-md ring-2 ring-white/50">
              <InitialsAvatar name={taxi.fullName} src={photo} size={avatarSize} className="!border-[3px] !border-white" />
            </div>
            <p className={`text-center font-extrabold tracking-tight ${medium ? 'mt-2.5 text-sm' : 'mt-3 text-base'}`}>
              {taxi.fullName}
            </p>
            <p className="mt-1 text-center text-xs font-semibold text-ink/70">
              {taxi.city}
              {taxi.carModel ? ` · ${taxi.carModel}` : ''}
            </p>
          </div>
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sun">
            Taxi
          </span>
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
