import { PaymentMethod, ServiceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateDriverBookingDto {
  @IsUUID()
  driverId!: string;

  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @Type(() => Date)
  @IsDate()
  endAt!: Date;

  @IsString()
  @IsNotEmpty()
  pickupAddress!: string;

  @IsOptional()
  @IsString()
  dropoffAddress?: string;

  @IsInt()
  @Min(0)
  totalAmountRwf!: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  renterPhone!: string;
}
