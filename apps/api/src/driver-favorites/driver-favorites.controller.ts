import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { DriverFavoritesService } from './driver-favorites.service';

@UseGuards(ClerkAuthGuard)
@Controller('driver-favorites')
export class DriverFavoritesController {
  constructor(private readonly driverFavoritesService: DriverFavoritesService) {}

  @Get()
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.driverFavoritesService.getMine(user);
  }

  @Post(':driverProfileId')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('driverProfileId', ParseUUIDPipe) driverProfileId: string,
  ) {
    return this.driverFavoritesService.add(user, driverProfileId);
  }

  @Delete(':driverProfileId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('driverProfileId', ParseUUIDPipe) driverProfileId: string,
  ) {
    return this.driverFavoritesService.remove(user, driverProfileId);
  }
}
