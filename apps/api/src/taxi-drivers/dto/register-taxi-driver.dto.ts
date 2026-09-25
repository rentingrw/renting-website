import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RegisterTaxiDriverDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  seats!: number;

  @IsOptional()
  @IsString()
  details?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  carModel!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  vehicleType!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  photos!: string[];

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}
