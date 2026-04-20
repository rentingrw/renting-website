import { IsOptional, IsString } from 'class-validator';

export class DismissDisputeDto {
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
