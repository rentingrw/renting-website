import type { ServiceType } from '@/lib/api';

/** Legacy DB values we no longer expose in the product UI. */
export const HIDDEN_CAR_SERVICE_TYPES: ServiceType[] = ['self_drive', 'with_driver'];

export const DEFAULT_CAR_LISTING_SERVICE_TYPE: ServiceType = 'corporate';

export const CAR_LISTING_SERVICE_OPTIONS: { value: ServiceType; label: string; desc?: string }[] = [
  { value: 'airport_transfer', label: 'Airport transfer', desc: 'Pickup and drop at the airport' },
  { value: 'corporate', label: 'Car rental', desc: 'Standard fleet listing' },
];

export function normalizeCarListingServiceType(serviceType: ServiceType): ServiceType {
  if (HIDDEN_CAR_SERVICE_TYPES.includes(serviceType)) {
    return DEFAULT_CAR_LISTING_SERVICE_TYPE;
  }
  return serviceType;
}

/** Human label for search/cards; omit legacy self-drive / with-driver wording. */
export function formatCarListingServiceLabel(serviceType: ServiceType): string | null {
  if (HIDDEN_CAR_SERVICE_TYPES.includes(serviceType)) {
    return null;
  }
  const hit = CAR_LISTING_SERVICE_OPTIONS.find((o) => o.value === serviceType);
  if (hit) return hit.label;
  return serviceType.replaceAll('_', ' ');
}

export function carListingSubtitleParts(vehicleType: string, serviceType: ServiceType): string[] {
  const parts: string[] = [];
  if (vehicleType) parts.push(vehicleType);
  const service = formatCarListingServiceLabel(serviceType);
  if (service) parts.push(service);
  return parts;
}