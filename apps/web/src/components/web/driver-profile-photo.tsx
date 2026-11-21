'use client';

import { ShieldCheck, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { InitialsAvatar } from '@/components/web/initials-avatar';
import { MediaImage } from '@/components/web/media-image';

type DriverProfilePhotoProps = {
  name: string;
  photoUrl?: string | null;
  /** Full-bleed listing card top vs. detail hero tile */
  variant: 'card' | 'hero';
  verified?: boolean;
  className?: string;
};

export function DriverProfilePhoto({
  name,
  photoUrl,
  variant,
  verified = false,
  className = '',
}: DriverProfilePhotoProps) {
  const t = useTranslations('web.listing');

  if (variant === 'card') {
    return (
      <div className={`relative aspect-[4/5] w-full bg-brand-soft ${className}`}>
        {photoUrl ? (
          <MediaImage src={photoUrl} alt={name} fill sizes="(max-width:640px) 100vw, 320px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <InitialsAvatar name={name} src={null} size={80} shape="portrait" className="!border-brand/20" />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-sun px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-ink shadow-sm">
          <UserRound className="h-3 w-3" strokeWidth={2.5} />
          {t('viewDriverProfile')}
        </span>
        {verified ? (
          <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
            <ShieldCheck className="h-4 w-4" strokeWidth={2.5} aria-label={t('verified')} />
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 rounded-2xl bg-sky-50/80 p-1.5 ${className}`}>
      <div className="relative aspect-[4/5] w-20 overflow-hidden rounded-xl bg-brand-soft sm:w-24">
        {photoUrl ? (
          <MediaImage src={photoUrl} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <InitialsAvatar name={name} src={null} size={64} shape="portrait" className="!border-brand/15" />
          </div>
        )}
        {verified ? (
          <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
            <ShieldCheck className="h-4 w-4" strokeWidth={2.5} aria-label={t('verified')} />
          </span>
        ) : null}
      </div>
    </div>
  );
}