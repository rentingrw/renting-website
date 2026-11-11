export type PriceRange = { min: number; max: number };

/** Public search/detail may hide exact rates and return approximate bands. */
export type CarDailyRateApproxRanges = {
  inCity?: PriceRange;
  outsideCity?: PriceRange;
  /** Legacy API shape (pre listing-city migration). */
  kigali?: PriceRange;
  countryside?: PriceRange;
};

export function pickInCityDailyApproxRange(ranges?: CarDailyRateApproxRanges | null): PriceRange | undefined {
  if (!ranges) return undefined;
  return ranges.inCity ?? ranges.kigali;
}

export function formatRwf(amount: number): string {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRwfRange(min: number, max: number): string {
  return `${formatRwf(min)} to ${formatRwf(max)}`;
}

export function formatCarDailyPriceLabel(input: {
  dailyRateInCityRwf?: number | null;
  approximateDailyRateRangeRwf?: CarDailyRateApproxRanges | null;
}): string | null {
  if (input.dailyRateInCityRwf != null && !Number.isNaN(input.dailyRateInCityRwf)) {
    return formatRwf(input.dailyRateInCityRwf);
  }
  const inCity = pickInCityDailyApproxRange(input.approximateDailyRateRangeRwf);
  if (inCity) return formatRwfRange(inCity.min, inCity.max);
  return null;
}

/** Admin tables — plain number, no currency symbol. */
export function formatRwfPlain(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-RW').format(n);
}
