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
    <section className="relative mb-8 overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-card">
      <div className="relative bg-gradient-to-br from-ink via-brand to-brand-bright px-6 pb-8 pt-6 text-white sm:px-8">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="rounded-full bg-gradient-to-br from-sun/80 to-hill/60 p-[3px] shadow-lg">
            <InitialsAvatar name={name} src={photo} size={120} className="!border-[3px] !border-ink" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-black md:text-3xl">{name}</h1>
              {bookedNow ? (
                <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                  {t('booked')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/95 px-2.5 py-1 text-[10px] font-bold text-emerald-950">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-800" />
                  {t('available')}
                </span>
              )}
            </div>
            {city ? (
              <p className="mt-1 flex items-center justify-center gap-1 font-medium text-white/75 sm:justify-start">
                <MapPin className="h-4 w-4 text-sun" />
                {city}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <TrustBadge score={trustScore} verified={verified} />
              {reviewCount > 0 && rating != null ? (
                <span className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-sm font-bold backdrop-blur-sm">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {rating.toFixed(1)}
                  <span className="font-medium text-white/70">({reviewCount})</span>
                </span>
              ) : null}
            </div>
            {actions ? <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">{actions}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
