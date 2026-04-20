import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BookingStatus, Prisma, type User } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { NotificationsService } from '../notifications/notifications.service';
import { realtimeEvents } from '../realtime/realtime.events';
import {
  CHAT_ALLOWED_BOOKING_STATUSES,
  MessageBookingTypeDto,
  type SendMessageDto,
} from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async send(authUser: AuthenticatedUser, payload: SendMessageDto) {
    const sender = await this.requireUser(authUser.clerkUserId);
    const bookingContext = await this.requireBookingContext(payload.bookingType, payload.bookingId);

    this.assertBookingChatAllowed(bookingContext.status);
    const receiverId = this.resolveCounterpartyId(bookingContext, sender.id);

    const message = await prisma.message.create({
      data: {
        senderId: sender.id,
        receiverId,
        content: payload.content.trim(),
        carBookingId: bookingContext.bookingType === MessageBookingTypeDto.car ? bookingContext.bookingId : null,
        driverBookingId:
          bookingContext.bookingType === MessageBookingTypeDto.driver ? bookingContext.bookingId : null,
      },
      include: this.messageInclude(),
    });

    this.notificationsService.emitInAppToUsers([receiverId], realtimeEvents.messageNew, {
      bookingType: bookingContext.bookingType,
      bookingId: bookingContext.bookingId,
      message,
    });

    return message;
  }

  async getHistory(authUser: AuthenticatedUser, bookingType: MessageBookingTypeDto, bookingId: string) {
    const caller = await this.requireUser(authUser.clerkUserId);
    const bookingContext = await this.requireBookingContext(bookingType, bookingId);
    this.assertParticipant(bookingContext, caller.id);

    return prisma.message.findMany({
      where:
        bookingType === MessageBookingTypeDto.car
          ? { carBookingId: bookingId }
          : { driverBookingId: bookingId },
      orderBy: {
        createdAt: 'asc',
      },
      include: this.messageInclude(),
    });
  }

  async markConversationRead(authUser: AuthenticatedUser, bookingType: MessageBookingTypeDto, bookingId: string) {
    const caller = await this.requireUser(authUser.clerkUserId);
    const bookingContext = await this.requireBookingContext(bookingType, bookingId);
    this.assertParticipant(bookingContext, caller.id);

    const where =
      bookingType === MessageBookingTypeDto.car
        ? { carBookingId: bookingId, receiverId: caller.id, readAt: null }
        : { driverBookingId: bookingId, receiverId: caller.id, readAt: null };

    const { count } = await prisma.message.updateMany({
      where,
      data: { readAt: new Date() },
    });

    return { markedRead: count };
  }

  async getUnreadCount(authUser: AuthenticatedUser) {
    const caller = await this.requireUser(authUser.clerkUserId);

    const count = await prisma.message.count({
      where: { receiverId: caller.id, readAt: null },
    });

    return { unread: count };
  }

  private assertBookingChatAllowed(status: BookingStatus) {
    if (!CHAT_ALLOWED_BOOKING_STATUSES.has(status)) {
      throw new BadRequestException('Chat is only available for confirmed or active bookings.');
    }
  }

  private assertParticipant(
    bookingContext: {
      firstPartyId: string;
      secondPartyId: string;
    },
    userId: string,
  ) {
    if (bookingContext.firstPartyId !== userId && bookingContext.secondPartyId !== userId) {
      throw new ForbiddenException('You can only access messages for your own bookings.');
    }
  }

  private resolveCounterpartyId(
    bookingContext: {
      firstPartyId: string;
      secondPartyId: string;
    },
    senderId: string,
  ) {
    this.assertParticipant(bookingContext, senderId);
    return bookingContext.firstPartyId === senderId
      ? bookingContext.secondPartyId
      : bookingContext.firstPartyId;
  }

  private async requireBookingContext(bookingType: MessageBookingTypeDto, bookingId: string) {
    if (bookingType === MessageBookingTypeDto.car) {
      const booking = await prisma.carBooking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          status: true,
          renterId: true,
          ownerId: true,
        },
      });

      if (!booking) {
        throw new NotFoundException('Car booking not found.');
      }

      return {
        bookingType,
        bookingId: booking.id,
        status: booking.status,
        firstPartyId: booking.renterId,
        secondPartyId: booking.ownerId,
      };
    }

    const booking = await prisma.driverBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        renterId: true,
        driverId: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Driver booking not found.');
    }

    return {
      bookingType,
      bookingId: booking.id,
      status: booking.status,
      firstPartyId: booking.renterId,
      secondPartyId: booking.driverId,
    };
  }

  private async requireUser(clerkUserId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Sync your account first.');
    }

    return user;
  }

  private messageInclude() {
    return {
      sender: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      receiver: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    } satisfies Prisma.MessageInclude;
  }
}
