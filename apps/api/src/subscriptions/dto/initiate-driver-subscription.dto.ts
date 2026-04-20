import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

import { SubscriptionPaymentMethodDto } from './initiate-subscription.dto';

export class InitiateDriverSubscriptionDto {
  @IsEnum(SubscriptionPaymentMethodDto)
  paymentMethod!: SubscriptionPaymentMethodDto;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  mobileNumber!: string;
}
