'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

type SearchFilterBarProps = {
  availableNow: boolean;
  onAvailableNowChange: (value: boolean) => void;
  topRated: boolean;
  onTopRatedChange: (value: boolean) => void;
  resultCount?: number;
  loading?: boolean;
  extra?: ReactNode;
  moreFilters?: ReactNode;
  variant?: 'light' | 'dark';
};

export function SearchFilterBar({
  availableNow,
  onAvailableNowChange,
  topRated,
  onTopRatedChange,
  resultCount,
  loading,
  extra,
  moreFilters,
  variant = 'light',
}: SearchFilterBarProps) {
  const t = useTranslations('web.listing');
  const tSearch = useTranslations('web.search');
  const [moreOpen, setMoreOpen] = useState(false);
  const dark = variant === 'dark';
  const idleChip = dark
    ? 'border-white/20 bg-white/10 text-white/85 hover:bg-white/15'
    : 'border-border bg-white text-muted-foreground';
  const moreChip = dark
    ? 'border-white/20 bg-white/10 text-white/85 hover:bg-white/15'
    : 'border-border bg-white text-muted-foreground';

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onAvailableNowChange(!availableNow)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            availableNow
              ? dark
                ? 'border-white bg-white text-ink'
                : 'border-hill bg-hill text-white'
              : idleChip
          }`}
        >
          {t('availableNow')}
        </button>
        <button
          type="button"
          onClick={() => onTopRatedChange(!topRated)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            topRated ? 'border-sun bg-sun text-ink' : idleChip
          }`}
        >
          {t('topRated')}
        </button>
        {extra}
        {moreFilters ? (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`ml-auto inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${moreChip}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('moreFilters')}
          </button>
        ) : null}
      </div>
      {resultCount != null ? (
        <p className={`mt-3 text-sm ${dark ? 'text-white/60' : 'text-muted-foreground'}`}>
          {loading ? t('loadingEllipsis') : tSearch('resultsCount', { count: resultCount })}
        </p>
      ) : null}
      {moreOpen && moreFilters ? (
        <div className="fixed inset-0 z-50 bg-ink/40 md:flex md:items-center md:justify-center">
          <div className="flex h-full w-full flex-col bg-card p-5 shadow-card md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-2xl md:border md:border-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">{t('moreFilters')}</h2>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label={t('closeFilters')}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">{moreFilters}</div>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="mt-5 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              {t('showResults')}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
