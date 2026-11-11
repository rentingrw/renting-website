import { IsIn } from 'class-validator';

export const TAXI_MARKETPLACE_STATUSES = ['active', 'inactive', 'booked'] as const;
export type TaxiMarketplaceStatus = (typeof TAXI_MARKETPLACE_STATUSES)[number];

export class SetTaxiStatusDto {
  @IsIn(TAXI_MARKETPLACE_STATUSES)
  status!: TaxiMarketplaceStatus;
}
