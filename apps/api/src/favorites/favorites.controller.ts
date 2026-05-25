import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { FavoritesService } from './favorites.service';

@UseGuards(ClerkAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.getMine(user);
  }

  @Post(':carListingId')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  add(@CurrentUser() user: AuthenticatedUser, @Param('carListingId', ParseUUIDPipe) carListingId: string) {
    return this.favoritesService.add(user, carListingId);
  }

  @Delete(':carListingId')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('carListingId', ParseUUIDPipe) carListingId: string) {
    return this.favoritesService.remove(user, carListingId);
  }
}
