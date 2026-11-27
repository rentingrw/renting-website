'use client';

import { useTranslations } from 'next-intl';

import { DriverProfilePhoto } from '@/components/web/driver-profile-photo';
import { VerifiedBadge } from '@/components/web/verified-badge';
import { isDriverVerified } from '@/lib/driver-listing-price';

type DriverProfileHeroProps = {
  name: string;
  photo?: string | null;
  verified?: boolean;
  bookedNow?: boolean;
};

export function DriverProfileHero({
  name,
  photo,
  verified: verifiedProp = false,
  bookedNow = false,
}: DriverProfileHeroProps) {
  const tListing = useTranslations('web.listing');
  const tDetail = useTranslations('web.detail');
  const verified = isDriverVerified({ verified: verifiedProp });

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
        <DriverProfilePhoto name={name} photoUrl={photo} variant="hero" verified={verified} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-ink md:text-3xl">{name}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {verified ? <VerifiedBadge label={tDetail('verified')} size="hero" /> : null}
            {bookedNow ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                {tListing('booked')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                {tListing('available')}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}