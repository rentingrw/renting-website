import { ServiceType, VehicleType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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

import {
  LISTING_PHOTO_URL_OPTIONS,
  transformListingRate,
} from '../../common/listing-photo-url.validator';

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

  @IsString()
  @MaxLength(24)
  plateNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(48)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  listingCity?: string;

  @Transform(({ obj }) => transformListingRate(obj as Record<string, unknown>, 'dailyRateInCityRwf', 'dailyRateKigaliRwf'))
  @IsInt()
  @Min(1000)
  dailyRateInCityRwf!: number;

  @Transform(({ obj }) =>
    transformListingRate(obj as Record<string, unknown>, 'dailyRateOutsideCityRwf', 'dailyRateCountrysideRwf'),
  )
  @IsInt()
  @Min(1000)
  dailyRateOutsideCityRwf!: number;

  @Transform(({ obj }) => {
    const body = obj as Record<string, unknown>;
    return (
      transformListingRate(body, 'weeklyRateInCityRwf', 'weeklyRateRwf') ??
      transformListingRate(body, 'dailyRateInCityRwf', 'dailyRateKigaliRwf')
    );
  })
  @IsInt()
  @Min(1000)
  weeklyRateInCityRwf!: number;

  @Transform(({ obj }) => {
    const body = obj as Record<string, unknown>;
    return (
      transformListingRate(body, 'weeklyRateOutsideCityRwf') ??
      transformListingRate(body, 'weeklyRateInCityRwf', 'weeklyRateRwf') ??
      transformListingRate(body, 'dailyRateOutsideCityRwf', 'dailyRateCountrysideRwf')
    );
  })
  @IsInt()
  @Min(1000)
  weeklyRateOutsideCityRwf!: number;

  @Transform(({ obj }) => {
    const body = obj as Record<string, unknown>;
    return (
      transformListingRate(body, 'monthlyRateInCityRwf', 'monthlyRateRwf') ??
      transformListingRate(body, 'dailyRateInCityRwf', 'dailyRateKigaliRwf')
    );
  })
  @IsInt()
  @Min(1000)
  monthlyRateInCityRwf!: number;

  @Transform(({ obj }) => {
    const body = obj as Record<string, unknown>;
    return (
      transformListingRate(body, 'monthlyRateOutsideCityRwf') ??
      transformListingRate(body, 'monthlyRateInCityRwf', 'monthlyRateRwf') ??
      transformListingRate(body, 'dailyRateOutsideCityRwf', 'dailyRateCountrysideRwf')
    );
  })
  @IsInt()
  @Min(1000)
  monthlyRateOutsideCityRwf!: number;

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

  @Transform(({ value }) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsUrl(LISTING_PHOTO_URL_OPTIONS, { each: true })
  photos!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  features!: string[];
}
