import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { TrustScoreService } from './trust-score.service';

@ApiTags('Trust Score')
@ApiBearerAuth()
@Controller('trust-score')
@UseGuards(ClerkAuthGuard)
export class TrustScoreController {
  constructor(private readonly trustScoreService: TrustScoreService) {}

  @Get('events')
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
}
