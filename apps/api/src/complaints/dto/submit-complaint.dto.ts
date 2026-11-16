import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitComplaintDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(30)
  phone!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;
}