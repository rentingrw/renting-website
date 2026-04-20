import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

import type { ProductTier } from '../subscription-tier.util';

export enum SubscriptionPaymentMethodDto {
  mtn_momo = 'mtn_momo',
  airtel_money = 'airtel_money',
}

export enum SubscriptionTierDto {
  basic = 'basic',
  premium = 'premium',
  enterprise = 'enterprise',
}

export class InitiateSubscriptionDto {
  @IsEnum(SubscriptionTierDto)
  tier!: ProductTier;

  @IsEnum(SubscriptionPaymentMethodDto)
  paymentMethod!: SubscriptionPaymentMethodDto;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  mobileNumber!: string;
}

