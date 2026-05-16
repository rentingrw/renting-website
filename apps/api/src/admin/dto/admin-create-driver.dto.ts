import { DriverCategory, Language, VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AdminCreateDriverDto {
  @IsString()
  userId!: string;

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  certifications?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  serviceAreas!: string[];
}
