import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSiteComplaintNotesDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}