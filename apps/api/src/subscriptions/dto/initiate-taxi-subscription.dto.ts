import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { SubscriptionPaymentMethodDto } from './initiate-subscription.dto';

export class InitiateTaxiSubscriptionDto {
  @IsEnum(SubscriptionPaymentMethodDto)
  paymentMethod!: SubscriptionPaymentMethodDto;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  mobileNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  promoCode?: string;
}