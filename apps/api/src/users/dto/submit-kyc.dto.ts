import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitKycDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  nationalIdNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  tinNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;
}
