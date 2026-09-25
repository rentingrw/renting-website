import { Language } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @Transform(({ value, obj }) => value ?? obj.full_name ?? obj.fullName)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @Transform(({ value, obj }) => value ?? obj.profile_photo_url ?? obj.profilePhotoUrl)
  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @Transform(({ value, obj }) => value ?? obj.language_preference ?? obj.languagePreference)
  @IsOptional()
  @IsEnum(Language)
  languagePreference?: Language;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;
}
