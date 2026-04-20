import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class AdjustTrustScoreDto {
  @Type(() => Number)
  @IsInt()
  @Min(-100)
  delta!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(280)
  reason!: string;
}
