'use client';

import { MapPin, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { InitialsAvatar } from '@/components/web/initials-avatar';
import { TrustBadge } from '@/components/web/trust-badge';

type ProfileHeaderProps = {
  name: string;
  photo?: string | null;
  city?: string | null;
  trustScore: number;
  verified?: boolean;
  rating?: number | null;
  reviewCount?: number;
  bookedNow?: boolean;
  actions?: ReactNode;
};

export function ProfileHeader({
  name,
  photo,
  city,
  trustScore,
  verified = false,
  rating,
  reviewCount = 0,
  bookedNow = false,
  actions,
}: ProfileHeaderProps) {
  const t = useTranslations('web.listing');
  return (
    <section className="mb-8 flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-start">
      <InitialsAvatar name={name} src={photo} size={128} />
      <div className="flex-1 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <h1 className="text-2xl font-black text-foreground md:text-3xl">{name}</h1>
          {bookedNow ? (
            <span className="rounded border-2 border-amber-500 bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
              {t('booked')}
            </span>
          ) : null}
        </div>
        {city ? (
          <p className="mt-1 flex items-center justify-center gap-1 font-medium text-muted-foreground sm:justify-start">
            <MapPin className="h-4 w-4 text-brand" />
            {city}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <TrustBadge score={trustScore} verified={verified} />
          {reviewCount > 0 && rating != null ? (
            <span className="flex items-center gap-1 rounded border-2 border-border bg-card px-2.5 py-1 text-sm font-black text-foreground">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
              <span className="font-medium text-muted-foreground">({reviewCount})</span>
            </span>
          ) : null}
        </div>
        {actions ? <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">{actions}</div> : null}
      </div>
    </section>
  );
}
