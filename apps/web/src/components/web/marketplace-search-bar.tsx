'use client';

import { CalendarDays } from 'lucide-react';
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
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.18)] sm:flex-row sm:items-stretch">
      <div className="flex flex-1 flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
        <label className="flex min-w-0 flex-[1.4] flex-col justify-center px-4 py-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t('home.pickupLocation')}
          </span>
          <AddressInput
            value={location}
            onChange={(value) => onLocationChange(value)}
            onPlaceSelected={onPlaceSelected}
            placeholder={t('search.locationPlaceholder')}
            className="mt-1 h-8 border-0 bg-transparent p-0 text-base font-medium leading-8 text-foreground placeholder:text-muted-foreground focus:ring-0"
            showLocateMe
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t('home.pickupDate')}
          </span>
          <div className="relative mt-1 flex h-8 items-center">
            <input
              type="date"
              value={from}
              onChange={(event) => onFromChange(event.target.value)}
              className="h-8 flex-1 border-0 bg-transparent p-0 text-base font-medium leading-8 text-foreground focus:ring-0 [color-scheme:light]"
            />
            <CalendarDays className="pointer-events-none absolute right-0 h-4 w-4 shrink-0 text-brand" aria-hidden />
          </div>
        </label>
        <label className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t('home.returnDate')}
          </span>
          <div className="relative mt-1 flex h-8 items-center">
            <input
              type="date"
              value={to}
              onChange={(event) => onToChange(event.target.value)}
              className="h-8 flex-1 border-0 bg-transparent p-0 text-base font-medium leading-8 text-foreground focus:ring-0 [color-scheme:light]"
            />
            <CalendarDays className="pointer-events-none absolute right-0 h-4 w-4 shrink-0 text-brand" aria-hidden />
          </div>
        </label>
      </div>
      <Link
        href={searchHref}
        className="flex items-center justify-center rounded-xl bg-brand px-8 py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-hover sm:min-w-[128px]"
      >
        {t('home.search')}
      </Link>
    </div>
  );
}
