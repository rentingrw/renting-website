import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class RegisterTaxiDriverDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  seats!: number;

  @IsString()
  @IsOptional()
  details?: string;

  @IsUrl()
  @IsOptional()
  photoUrl?: string;

  @IsUrl()
  @IsOptional()
  profilePhotoUrl?: string;
}
