'use client';

import { useTranslations } from 'next-intl';

export type MarketplaceVisibility = 'active' | 'inactive' | 'booked';

type MarketplaceVisibilityControlProps = {
  value: MarketplaceVisibility;
  disabled?: boolean;
  size?: 'sm' | 'md';
  onChange: (next: MarketplaceVisibility) => void;
};

const OPTIONS: MarketplaceVisibility[] = ['active', 'booked', 'inactive'];

export function MarketplaceVisibilityControl({
  value,
  disabled,
  size = 'md',
  onChange,
}: MarketplaceVisibilityControlProps) {
  const t = useTranslations('web.app.marketplaceVisibility');

  const pad = size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs';

  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-0.5"
      role="group"
      aria-label={t('ariaLabel')}
    >
      {OPTIONS.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`rounded-md font-bold capitalize transition ${pad} ${
              active
                ? option === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : option === 'booked'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-neutral-700 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            } disabled:opacity-50`}
          >
            {t(option)}
          </button>
        );
      })}
    </div>
  );
}

export function marketplaceVisibilityFromCarStatus(status: string): MarketplaceVisibility | null {
  if (status === 'active') return 'active';
  if (status === 'booked') return 'booked';
  if (status === 'inactive' || status === 'paused') return 'inactive';
  return null;
}

export function marketplaceVisibilityFromTaxiStatus(status: string): MarketplaceVisibility | null {
  if (status === 'active') return 'active';
  if (status === 'booked') return 'booked';
  if (status === 'inactive') return 'inactive';
  return null;
}