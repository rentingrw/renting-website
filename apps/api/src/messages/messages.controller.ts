import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsUUID } from 'class-validator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { MessageBookingTypeDto, SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

class MessageBookingParamsDto {
  @IsEnum(MessageBookingTypeDto)
  bookingType!: MessageBookingTypeDto;

  @IsUUID()
  bookingId!: string;
}

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(ClerkAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message in a booking conversation' })
  sendMessage(@CurrentUser() user: AuthenticatedUser, @Body() payload: SendMessageDto) {
    return this.messagesService.send(user, payload);
  }

  @Get(':bookingType/:bookingId')
  @ApiOperation({ summary: 'Get message history for a booking conversation' })
  getHistory(@CurrentUser() user: AuthenticatedUser, @Param() params: MessageBookingParamsDto) {
    return this.messagesService.getHistory(user, params.bookingType, params.bookingId);
  }

  @Patch(':bookingType/:bookingId/read')
  @ApiOperation({ summary: 'Mark all unread messages in a conversation as read' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param() params: MessageBookingParamsDto) {
    return this.messagesService.markConversationRead(user, params.bookingType, params.bookingId);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get total unread message count for the authenticated user' })
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.getUnreadCount(user);
  }
}
