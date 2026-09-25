import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertHosterProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  workAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;
}
