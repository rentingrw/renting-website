import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDisputeDto {
  @IsOptional()
  @IsUUID()
  carBookingId?: string;

  @IsOptional()
  @IsUUID()
  driverBookingId?: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
