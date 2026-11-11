import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const OWNER_LISTING_MARKETPLACE_STATUSES = ['active', 'inactive', 'booked'] as const;
export type OwnerListingMarketplaceStatus = (typeof OWNER_LISTING_MARKETPLACE_STATUSES)[number];

export class SetListingStatusDto {
  @ApiProperty({ enum: OWNER_LISTING_MARKETPLACE_STATUSES })
  @IsIn(OWNER_LISTING_MARKETPLACE_STATUSES)
  status!: OwnerListingMarketplaceStatus;
}
