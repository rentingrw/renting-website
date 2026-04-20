import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectListingDto {
  @ApiProperty({ example: 'Photos are unclear and pricing seems incorrect.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
