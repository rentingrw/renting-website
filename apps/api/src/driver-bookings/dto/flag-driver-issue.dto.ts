import { IsOptional, IsString } from 'class-validator';

export class FlagDriverIssueDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
