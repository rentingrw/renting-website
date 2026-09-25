import { IsOptional, IsUUID } from 'class-validator';

export class TryNextBookingDto {
  @IsOptional()
  @IsUUID()
  listingId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;
}
