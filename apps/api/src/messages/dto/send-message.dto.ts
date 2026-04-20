import { BookingStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export enum MessageBookingTypeDto {
  car = 'car',
  driver = 'driver',
}

export const CHAT_ALLOWED_BOOKING_STATUSES = new Set<BookingStatus>([
  BookingStatus.confirmed,
  BookingStatus.active,
]);

export class SendMessageDto {
  @IsEnum(MessageBookingTypeDto)
  bookingType!: MessageBookingTypeDto;

  @IsUUID()
  bookingId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;
}
