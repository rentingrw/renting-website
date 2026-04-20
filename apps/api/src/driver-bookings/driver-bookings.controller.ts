import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { DriverBookingsService } from './driver-bookings.service';
import { CreateDriverBookingDto } from './dto/create-driver-booking.dto';
import { FlagDriverIssueDto } from './dto/flag-driver-issue.dto';

@ApiTags('Driver Bookings')
@ApiBearerAuth()
@Controller('driver-bookings')
@UseGuards(ClerkAuthGuard)
export class DriverBookingsController {
  constructor(private readonly driverBookingsService: DriverBookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new driver booking request' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() payload: CreateDriverBookingDto) {
    return this.driverBookingsService.create(user, payload);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a pending driver booking' })
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.driverBookingsService.confirm(user, id);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline a pending driver booking' })
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.driverBookingsService.decline(user, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an active driver booking' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.driverBookingsService.cancel(user, id);
  }

  @Post(':id/mark-complete')
  @ApiOperation({ summary: 'Mark a driver booking as completed' })
  markComplete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.driverBookingsService.markComplete(user, id);
  }

  @Post(':id/flag-issue')
  @ApiOperation({ summary: 'Flag an issue with a driver booking' })
  flagIssue(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() payload: FlagDriverIssueDto) {
    return this.driverBookingsService.flagIssue(user, id, payload.reason);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get all driver bookings for the authenticated user' })
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.driverBookingsService.getMine(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a driver booking by ID' })
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.driverBookingsService.getById(user, id);
  }
}
