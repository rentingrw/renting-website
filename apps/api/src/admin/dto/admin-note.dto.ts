import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
