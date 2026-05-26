import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OptionalClerkAuthGuard } from '../auth/guards/optional-clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { DriversService } from './drivers.service';
import { CreateDriverProfileDto, UpdateDriverProfileDto } from './dto/upsert-driver-profile.dto';

@ApiTags('Drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post('profile')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new driver profile for the authenticated user' })
  createProfile(@CurrentUser() user: AuthenticatedUser, @Body() payload: CreateDriverProfileDto) {
    return this.driversService.createProfile(user, payload);
  }

  @Patch('profile')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated user\'s driver profile' })
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() payload: UpdateDriverProfileDto) {
    return this.driversService.updateProfile(user, payload);
  }

  @Get('profile/me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user\'s own driver profile' })
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.driversService.getMyProfile(user);
  }

  @Get(':id')
  @SkipThrottle()
  @UseGuards(OptionalClerkAuthGuard)
  @ApiOperation({ summary: 'Get a driver\'s public profile by ID' })
  getPublicProfile(@Param('id') id: string, @Req() request: { user?: AuthenticatedUser }) {
    return this.driversService.getById(id, request.user);
  }
}
