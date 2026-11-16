import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const MARKETPLACE_VISIBILITY_STATUSES = ['active', 'inactive', 'booked'] as const;
export type MarketplaceVisibilityStatus = (typeof MARKETPLACE_VISIBILITY_STATUSES)[number];

export class SetMarketplaceVisibilityDto {
  @ApiProperty({ enum: MARKETPLACE_VISIBILITY_STATUSES })
  @IsIn(MARKETPLACE_VISIBILITY_STATUSES)
  status!: MarketplaceVisibilityStatus;
}