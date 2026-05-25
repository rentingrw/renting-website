import { DriverCategory, ServiceType, VehicleType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum SearchType {
  cars = 'cars',
  drivers = 'drivers',
  all = 'all',
}

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export class SearchQueryDto {
  @ApiPropertyOptional({ enum: SearchType, description: 'Search domain. Defaults to "all".' })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType;

  @ApiPropertyOptional({ description: 'Free-text query used for ranking/search terms.' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  query?: string;

  @ApiPropertyOptional({
    description:
      'Preferred location input. Accepts plain-text places (for geocoding), and still supports "latitude,longitude" for backward compatibility.',
    example: 'Kigali Convention Centre',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsString()
  @MaxLength(160)
  location?: string;

  @ApiPropertyOptional({
    description:
      'Explicit latitude. Provide together with longitude to bypass location geocoding.',
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description:
      'Explicit longitude. Provide together with latitude to bypass location geocoding.',
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Transform(({ value, obj }) => toNumber(value ?? obj.radius_km))
  @IsNumber()
  @Min(0.5)
  @Max(500)
  radiusKm?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @IsOptional()
  @Transform(({ value, obj }) => value ?? obj.category)
  @IsEnum(DriverCategory)
  driverCategory?: DriverCategory;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  driverHasVehicle?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  driverTransmission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  driverLicenseCategory?: string;

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  @Max(60)
  seatsMin?: number;

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  @Max(60)
  seatsMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  transmission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  fuelType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  model?: string;

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Pagination offset.', minimum: 0, maximum: 10000 })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(0)
  @Max(10000)
  offset?: number;
}
