import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

import {
  SubscriptionPaymentMethodDto,
  SubscriptionTierDto,
} from './initiate-subscription.dto';
import type { ProductTier } from '../subscription-tier.util';

export class UpgradeSubscriptionDto {
  @IsEnum(SubscriptionTierDto)
  tier!: ProductTier;

  @IsEnum(SubscriptionPaymentMethodDto)
  paymentMethod!: SubscriptionPaymentMethodDto;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  mobileNumber!: string;
}

