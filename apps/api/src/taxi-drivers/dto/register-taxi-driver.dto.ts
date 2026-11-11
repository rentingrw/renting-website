import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  workLocationText?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  languages!: string[];

  @IsOptional()
  @IsBoolean()
  contactPhoneEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  contactWhatsappEnabled?: boolean;

  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  seats!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  features?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  photos!: string[];

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsString()
  @IsNotEmpty()
  profilePhotoUrl!: string;

  @IsOptional()
  @IsBoolean()
  acceptedTerms?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptedPlatformFee?: boolean;
}
