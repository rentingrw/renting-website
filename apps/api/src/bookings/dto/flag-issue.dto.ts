import { IsOptional, IsString } from 'class-validator';

export class FlagIssueDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
