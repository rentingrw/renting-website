import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { InitiateSubscriptionDto } from './dto/initiate-subscription.dto';
import { InitiateDriverSubscriptionDto } from './dto/initiate-driver-subscription.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('initiate')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Initiate a new car-owner subscription payment' })
  initiate(@CurrentUser() user: AuthenticatedUser, @Body() payload: InitiateSubscriptionDto) {
    return this.subscriptionsService.initiate(user, payload);
  }

  @Post('webhook/flutterwave')
  @SkipThrottle()
  @ApiOperation({ summary: 'Receive and process Flutterwave payment webhook events' })
  handleFlutterwaveWebhook(
    @Req() request: Request,
    @Headers('verif-hash') verifHash?: string,
  ) {
    return this.subscriptionsService.handleFlutterwaveWebhook(request.body, verifHash);
  }

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the active car-owner subscription for the authenticated user' })
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getMine(user);
  }

  @Post('upgrade')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upgrade the authenticated user\'s car-owner subscription tier' })
  upgrade(@CurrentUser() user: AuthenticatedUser, @Body() payload: UpgradeSubscriptionDto) {
    return this.subscriptionsService.upgrade(user, payload);
  }

  @Post('cancel')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel the authenticated user\'s car-owner subscription' })
  cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.cancel(user);
  }

  @Get('history')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history for car-owner subscriptions' })
  getPaymentHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getPaymentHistory(user);
  }

  @Get('driver/history')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history for driver subscriptions' })
  getDriverPaymentHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getDriverPaymentHistory(user);
  }

  @Post('driver/initiate')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Initiate a new driver subscription payment' })
  initiateDriver(@CurrentUser() user: AuthenticatedUser, @Body() payload: InitiateDriverSubscriptionDto) {
    return this.subscriptionsService.initiateDriver(user, payload);
  }

  @Get('driver/me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the active driver subscription for the authenticated user' })
  getDriverSubscriptionMine(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getDriverSubscriptionMine(user);
  }

  @Post('driver/cancel')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel the authenticated user\'s driver subscription' })
  cancelDriverSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.cancelDriverSubscription(user);
  }
}

