export function formatCurrencyRwf(value: number): string {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(value);
}

export type TrustTone = 'good' | 'watch' | 'risk';

export function trustTierFromScore(score: number): string {
  if (score >= 95) return 'Platinum';
  if (score >= 85) return 'Gold';
  if (score >= 70) return 'Silver';
  return 'Bronze';
}

export function trustToneFromScore(score: number): TrustTone {
  if (score >= 85) return 'good';
  if (score >= 70) return 'watch';
  return 'risk';
}

export function trustToneClass(score: number): string {
  const tone = trustToneFromScore(score);
  if (tone === 'good') return 'bg-emerald-50 text-emerald-800';
  if (tone === 'watch') return 'bg-amber-50 text-amber-800';
  return 'bg-red-50 text-red-800';
}

export function formatRange(min: number, max: number): string {
  return `${formatCurrencyRwf(min)} to ${formatCurrencyRwf(max)}`;
}
