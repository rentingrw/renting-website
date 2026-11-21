import { Equals, IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { ProviderAgreementDto } from '../../common/dto/provider-agreement.dto';

export class SubmitCompanyPartnerDto extends ProviderAgreementDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  companyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  workAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  tinNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsBoolean()
  @Equals(true, {
    message: 'You must acknowledge how booking notifications and admin coordination work.',
  })
  understoodBookingFlow!: boolean;
}