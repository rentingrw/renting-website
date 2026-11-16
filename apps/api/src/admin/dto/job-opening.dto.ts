import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateJobOpeningDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  employmentType!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  location!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value))
  @ValidateIf((_, value) => value != null && value !== '')
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  externalApplyUrl?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value))
  @ValidateIf((_, value) => value != null && value !== '')
  @IsDateString()
  applicationDeadline?: string | null;
}

export class UpdateJobOpeningDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  employmentType?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value))
  @ValidateIf((_, value) => value != null && value !== '')
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  externalApplyUrl?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value))
  @ValidateIf((_, value) => value != null && value !== '')
  @IsDateString()
  applicationDeadline?: string | null;
}

export class ApplyJobDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(30)
  phone!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;
}
