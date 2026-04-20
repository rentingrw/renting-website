import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/authenticated-request.interface';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { AuthService } from './auth.service';
import { SyncUserDto } from './dto/sync-user.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sync')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @Throttle({ strict: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Sync the authenticated Clerk user into the local database' })
  async sync(@CurrentUser() user: AuthenticatedUser, @Body() payload: SyncUserDto) {
    const syncedUser = await this.authService.syncUser(user.clerkUserId, payload);

    return {
      id: syncedUser.id,
      email: syncedUser.email,
      fullName: syncedUser.fullName,
      primaryRole: syncedUser.primaryRole,
      languagePreference: syncedUser.languagePreference,
    };
  }
}
