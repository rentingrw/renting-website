import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const ADMIN_LISTING_MARKETPLACE_STATUSES = ['active', 'inactive', 'booked'] as const;
export type AdminListingMarketplaceStatus = (typeof ADMIN_LISTING_MARKETPLACE_STATUSES)[number];

export class AdminSetListingStatusDto {
  @ApiProperty({ enum: ADMIN_LISTING_MARKETPLACE_STATUSES })
  @IsIn(ADMIN_LISTING_MARKETPLACE_STATUSES)
  status!: AdminListingMarketplaceStatus;
}
