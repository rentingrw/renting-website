import { formatCurrencyRwf } from '@/lib/format';

type DriverRateFields = {
  hourlyRateRwf?: number | null;
  dailyRateRwf?: number;
  approximateRateRangeRwf?: {
    daily: { min: number; max: number };
    hourly?: { min: number; max: number };
  };
};

export type DriverLeadPrice = {
  amount: string;
  unit: 'hour' | 'day';
};

/** Lowest public “from” rate for driver cards (hourly preferred when set). */
export function driverLeadPrice(driver: DriverRateFields): DriverLeadPrice | null {
  const hourly = driver.hourlyRateRwf ?? driver.approximateRateRangeRwf?.hourly?.min;
  const daily = driver.dailyRateRwf ?? driver.approximateRateRangeRwf?.daily?.min;
  if (hourly != null && !Number.isNaN(hourly)) {
    return { amount: formatCurrencyRwf(hourly), unit: 'hour' };
  }
  if (daily != null && !Number.isNaN(daily)) {
    return { amount: formatCurrencyRwf(daily), unit: 'day' };
  }
  return null;
}

/** Admin-approved driver profile (platform verification badge). */
export function isDriverVerified(status?: string | null): boolean {
  return status === 'approved';
}

export function driverPublicAreas(driver: { serviceAreas?: string[]; primaryCity?: string }): string {
  const areas = (driver.serviceAreas ?? []).filter((item) => !item.startsWith('Availability:'));
  if (areas.length > 0) {
    return areas.length > 2 ? `${areas.slice(0, 2).join(', ')}…` : areas.join(', ');
  }
  return driver.primaryCity?.trim() ?? '';
}