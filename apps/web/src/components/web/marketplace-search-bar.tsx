'use client';

import { ArrowRight, CalendarDays, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AddressInput } from '@/components/web/address-input';

type MarketplaceSearchBarProps = {
  location: string;
  from: string;
  to: string;
  searchHref: string;
  onLocationChange: (value: string) => void;
  onPlaceSelected: (place: { address: string; latitude: number; longitude: number }) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

const fieldLabel = 'text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground';
const dateInput =
  'date-field h-8 w-full min-w-0 border-0 bg-transparent p-0 text-base font-semibold leading-8 text-foreground focus:outline-none focus:ring-0 [color-scheme:light]';

export function MarketplaceSearchBar({
  location,
  from,
  to,
  searchHref,
  onLocationChange,
  onPlaceSelected,
  onFromChange,
  onToChange,
}: MarketplaceSearchBarProps) {
  const t = useTranslations('web');

  return (
    <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-1.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="flex flex-col gap-1.5 rounded-[1.4rem] bg-white p-1.5 lg:flex-row lg:items-stretch">
        <div className="grid flex-1 grid-cols-2 lg:flex lg:divide-x lg:divide-border">
          <label className="col-span-2 flex min-w-0 items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-secondary/60 lg:flex-[1.5] lg:rounded-none lg:hover:bg-transparent">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <MapPin className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={fieldLabel}>{t('home.pickupLocation')}</span>
              <AddressInput
                value={location}
                onChange={(value) => onLocationChange(value)}
                onPlaceSelected={onPlaceSelected}
                placeholder={t('search.locationPlaceholder')}
                className="mt-0.5 h-8 border-0 bg-transparent p-0 text-base font-semibold leading-8 text-foreground placeholder:font-medium placeholder:text-muted-foreground focus:ring-0"
                showLocateMe
              />
            </span>
          </label>
          <label className="flex min-w-0 items-center gap-3 border-t border-border px-4 py-3 lg:flex-1 lg:border-t-0">
            <CalendarDays className="hidden h-5 w-5 shrink-0 text-brand sm:block" strokeWidth={2.25} aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={fieldLabel}>{t('home.pickupDate')}</span>
              <input
                type="date"
                value={from}
                onChange={(event) => onFromChange(event.target.value)}
                className={dateInput}
              />
            </span>
          </label>
          <label className="flex min-w-0 items-center gap-3 border-l border-t border-border px-4 py-3 lg:flex-1 lg:border-t-0">
            <CalendarDays className="hidden h-5 w-5 shrink-0 text-brand sm:block" strokeWidth={2.25} aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={fieldLabel}>{t('home.returnDate')}</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => onToChange(event.target.value)}
                className={dateInput}
              />
            </span>
          </label>
        </div>
        <Link
          href={searchHref}
          className="group flex items-center justify-center gap-2 rounded-[1.1rem] bg-gradient-to-br from-[#1f4a3f] via-brand to-brand-strong px-7 py-4 text-base font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition hover:brightness-125 lg:min-w-[150px]"
        >
          {t('home.search')}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
