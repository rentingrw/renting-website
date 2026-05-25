import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class RegisterTaxiDriverDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

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
}
