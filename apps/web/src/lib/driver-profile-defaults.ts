import type { DriverCategory, VehicleType } from '@/lib/api';

/** Defaults for API fields no longer collected in the driver UI. */
export const DRIVER_PROFILE_API_DEFAULTS = {
  driverCategory: 'city' as DriverCategory,
  categories: ['city'] as DriverCategory[],
  vehicleTypes: ['sedan'] as VehicleType[],
};

export function defaultPrimaryCity(addressDistrict: string, serviceDistricts: string[]): string {
  const fromAddress = addressDistrict.trim();
  if (fromAddress) return fromAddress;
  if (serviceDistricts[0]?.trim()) return serviceDistricts[0].trim();
  return 'Kigali';
}