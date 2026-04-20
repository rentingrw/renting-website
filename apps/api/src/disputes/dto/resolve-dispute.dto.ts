import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

class TrustAdjustmentDto {
  @IsUUID()
  userId!: string;

  @Type(() => Number)
  @IsInt()
  delta!: number;

  @IsString()
  reason!: string;
}

export class ResolveDisputeDto {
  @IsIn(['auto_completed', 'cancelled_admin'])
  bookingOutcome!: 'auto_completed' | 'cancelled_admin';

  @IsString()
  resolutionNote!: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrustAdjustmentDto)
  trustAdjustments?: TrustAdjustmentDto[];
}
