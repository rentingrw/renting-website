import { ServiceType, VehicleType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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

export class AdminCreateCarDto {
  @IsString()
  userId!: string;

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({}, { each: true })
  photos?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  features?: string[];
}
