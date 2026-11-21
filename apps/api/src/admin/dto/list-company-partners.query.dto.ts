import { CompanyPartnerApplicationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListCompanyPartnersQueryDto {
  @IsOptional()
  @IsEnum(CompanyPartnerApplicationStatus)
  status?: CompanyPartnerApplicationStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}