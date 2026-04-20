import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FlagIssueDto } from './dto/flag-issue.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(ClerkAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new car booking request' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() payload: CreateBookingDto) {
    return this.bookingsService.create(user, payload);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a pending car booking' })
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.confirm(user, id);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline a pending car booking' })
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.decline(user, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an active car booking' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.cancel(user, id);
  }

  @Post(':id/mark-complete')
  @ApiOperation({ summary: 'Mark a car booking as completed' })
  markComplete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.markComplete(user, id);
  }

  @Post(':id/flag-issue')
  @ApiOperation({ summary: 'Flag an issue with a car booking' })
  flagIssue(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() payload: FlagIssueDto) {
    return this.bookingsService.flagIssue(user, id, payload.reason);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get all car bookings for the authenticated user' })
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.getMine(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a car booking by ID' })
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.getById(user, id);
  }
}
