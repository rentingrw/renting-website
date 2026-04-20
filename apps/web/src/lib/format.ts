export function formatCurrencyRwf(value: number): string {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(value);
}

export function trustTierFromScore(score: number): string {
  if (score >= 95) return 'Platinum';
  if (score >= 85) return 'Gold';
  if (score >= 70) return 'Silver';
  return 'Bronze';
}

export function formatRange(min: number, max: number): string {
  return `${formatCurrencyRwf(min)} - ${formatCurrencyRwf(max)}`;
}
