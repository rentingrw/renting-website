import { Language, RoleType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class SyncUserDto {
  @Transform(({ value, obj }) => value ?? obj.email_address ?? obj.email)
  @IsEmail()
  email!: string;

  @Transform(({ value, obj }) => value ?? obj.phone_number ?? obj.phone)
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @Transform(({ value, obj }) => value ?? obj.full_name ?? obj.fullName)
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @Transform(({ value, obj }) => value ?? obj.profile_photo_url ?? obj.profilePhotoUrl)
  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @Transform(({ value, obj }) => value ?? obj.primary_role ?? obj.primaryRole)
  @IsEnum(RoleType)
  primaryRole!: RoleType;

  @Transform(({ value, obj }) => value ?? obj.language_preference ?? obj.languagePreference)
  @IsOptional()
  @IsEnum(Language)
  languagePreference?: Language;
}
