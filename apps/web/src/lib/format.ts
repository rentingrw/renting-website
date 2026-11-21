export function formatCurrencyRwf(value: number): string {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRange(min: number, max: number): string {
  return `${formatCurrencyRwf(min)} to ${formatCurrencyRwf(max)}`;
}

/** Public listing cards: one per-day amount (exact rate or low end of approximate band). */
export function formatPublicDailyRateRwf(exact?: number | null, approximateMin?: number | null): string | null {
  if (exact != null && !Number.isNaN(exact)) return formatCurrencyRwf(exact);
  if (approximateMin != null && !Number.isNaN(approximateMin)) return formatCurrencyRwf(approximateMin);
  return null;
}
