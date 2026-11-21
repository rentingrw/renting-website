import { ServiceType } from './enums';

export const HIDDEN_CAR_SERVICE_TYPES: ServiceType[] = [
  ServiceType.self_drive,
  ServiceType.with_driver,
];

export const DEFAULT_CAR_LISTING_SERVICE_TYPE = ServiceType.corporate;

export const ADMIN_CAR_LISTING_SERVICE_TYPES: ServiceType[] = [
  ServiceType.airport_transfer,
  ServiceType.corporate,
  ServiceType.private_driver,
];

export function formatCarListingServiceLabel(serviceType: string): string | null {
  if (HIDDEN_CAR_SERVICE_TYPES.includes(serviceType as ServiceType)) {
    return null;
  }
  switch (serviceType) {
    case ServiceType.airport_transfer:
      return 'Airport transfer';
    case ServiceType.corporate:
      return 'Car rental';
    case ServiceType.private_driver:
      return 'Private driver';
    default:
      return serviceType.replaceAll('_', ' ');
  }
}