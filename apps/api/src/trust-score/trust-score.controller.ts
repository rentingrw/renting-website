import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { TrustScoreService } from './trust-score.service';

@ApiTags('Trust Score')
@Controller('trust-score')
export class TrustScoreController {
  constructor(private readonly trustScoreService: TrustScoreService) {}

  @Get('events')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the trust score event log for the authenticated user' })
  async getMyEventLog(@CurrentUser() authUser: AuthenticatedUser) {
    const user = await prisma.user.findUnique({
      where: { clerkId: authUser.clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return [];
    }

    return this.trustScoreService.getEventsForUser(user.id);
  }

  @Get('public/:userId')
  @SkipThrottle()
  @ApiOperation({ summary: 'Public trust score event log for a user profile' })
  getPublicLog(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.trustScoreService.getPublicEvents(userId);
  }
}
