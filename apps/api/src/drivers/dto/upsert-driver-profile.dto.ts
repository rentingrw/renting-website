import { DriverCategory, Language, VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class UnavailableRangeDto {
  @IsString()
  @IsNotEmpty()
  from!: string;

  @IsString()
  @IsNotEmpty()
  to!: string;
}

export class CreateDriverProfileDto {
  @IsEnum(DriverCategory)
  driverCategory!: DriverCategory;

  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  biography?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  dailyRateRwf!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  hourlyRateRwf?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  weeklyRateRwf?: number;

  @IsString()
  @MaxLength(120)
  primaryCity!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Language, { each: true })
  languages!: Language[];

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(DriverCategory, { each: true })
  categories!: DriverCategory[];

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(VehicleType, { each: true })
  vehicleTypes!: VehicleType[];

  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  certifications!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  serviceAreas!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnavailableRangeDto)
  availabilityCalendar!: UnavailableRangeDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  licenseCategories?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  transmission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressText?: string;

  @IsOptional()
  @IsString()
  idDocumentUrl?: string;

  @IsOptional()
  @IsString()
  licenseDocumentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsEnum(DriverCategory)
  driverCategory?: DriverCategory;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  biography?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  dailyRateRwf?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  hourlyRateRwf?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  weeklyRateRwf?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  primaryCity?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Language, { each: true })
  languages?: Language[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(DriverCategory, { each: true })
  categories?: DriverCategory[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(VehicleType, { each: true })
  vehicleTypes?: VehicleType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  certifications?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  serviceAreas?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnavailableRangeDto)
  availabilityCalendar?: UnavailableRangeDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  licenseCategories?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  transmission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressText?: string;

  @IsOptional()
  @IsString()
  idDocumentUrl?: string;

  @IsOptional()
  @IsString()
  licenseDocumentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}
