import { ServiceType, VehicleType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCarDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @IsString()
  @MaxLength(64)
  brand!: string;

  @IsString()
  @MaxLength(64)
  model!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1980)
  @Max(new Date().getFullYear() + 1)
  year!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(60)
  seats!: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  transmission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  fuelType?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1000)
  dailyRateKigaliRwf!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1000)
  dailyRateCountrysideRwf!: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1000)
  weeklyRateRwf?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1000)
  monthlyRateRwf?: number;

  @IsOptional()
  @IsBoolean()
  priceNegotiable?: boolean;

  @IsString()
  @MaxLength(255)
  locationText!: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({}, { each: true })
  photos!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  features!: string[];
}
