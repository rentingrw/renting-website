import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CarHostType } from '@prisma/client';

export class UpsertHosterProfileDto {
  @IsOptional()
  @IsEnum(CarHostType)
  hostType?: CarHostType;

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
