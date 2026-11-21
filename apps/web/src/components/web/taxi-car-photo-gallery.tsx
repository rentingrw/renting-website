'use client';

import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { InitialsAvatar } from '@/components/web/initials-avatar';
import { MediaImage } from '@/components/web/media-image';
import { ShareMenu } from '@/components/web/share-menu';
import type { SupportedLocale } from '@/i18n/routing';

type TaxiCarPhotoGalleryProps = {
  photos: string[];
  driverName: string;
  profilePhotoUrl?: string | null;
  locationLine: string;
  taxiLabel: string;
  shareUrl: string;
  shareTitle: string;
  shareText: string;
};

export function TaxiCarPhotoGallery({
  photos,
  driverName,
  profilePhotoUrl,
  locationLine,
  taxiLabel,
  shareUrl,
  shareTitle,
  shareText,
}: TaxiCarPhotoGalleryProps) {
  const [index, setIndex] = useState(0);
  const hasMultiple = photos.length > 1;
  const current = photos[index] ?? photos[0] ?? null;

  useEffect(() => {
    setIndex(0);
  }, [photos]);

  const prev = useCallback(() => {
    setIndex((i) => (i <= 0 ? photos.length - 1 : i - 1));
  }, [photos.length]);

  const next = useCallback(() => {
    setIndex((i) => (i >= photos.length - 1 ? 0 : i + 1));
  }, [photos.length]);

  return (
    <div className="overflow-hidden">
      <div className="relative min-h-[220px] overflow-hidden sm:min-h-[280px] sm:aspect-[16/10]">
        {current ? (
          <MediaImage
            key={current}
            src={current}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted via-brand-soft to-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/50 to-ink/20" />

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-black/35 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
              aria-label="Previous car photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-black/35 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
              aria-label="Next car photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute right-3 top-3 z-20 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
              {index + 1} / {photos.length}
            </span>
          </>
        ) : null}

        <div
          className={`absolute z-20 ${hasMultiple ? 'right-3 top-12' : 'right-3 top-3'}`}
        >
          <ShareMenu
            url={shareUrl}
            title={shareTitle}
            text={shareText}
            className="border-white/30 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
          />
        </div>

        <div className="relative z-10 flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <InitialsAvatar
              name={driverName}
              src={profilePhotoUrl}
              size={72}
              shape="circle"
              className="ring-2 ring-white/90 shadow-lg"
            />
            <div className="min-w-0 pb-1 text-white">
              <h1 className="text-2xl font-black">{driverName}</h1>
              {locationLine ? (
                <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-white/85">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {locationLine}
                </p>
              ) : null}
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-sun">{taxiLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {hasMultiple ? (
        <div className="flex gap-2 overflow-x-auto border-t border-border bg-muted/30 p-3">
          {photos.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === index ? 'border-brand ring-2 ring-brand/30' : 'border-border opacity-80 hover:opacity-100'
              }`}
              aria-label={`Car photo ${i + 1}`}
            >
              <MediaImage src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}