import { formatCarDailyPriceLabel, type CarDailyRateApproxRanges } from '@rentingi/types';

import type { SearchCar } from '@/lib/api';

export type { CarDailyRateApproxRanges };

/** Daily price for cards/search when exact rates may be hidden (approximate in-city range). */
export function formatSearchCarDailyPrice(
  car: Pick<SearchCar, 'dailyRateInCityRwf' | 'approximateDailyRateRangeRwf'>,
): string | null {
  return formatCarDailyPriceLabel(car);
}
