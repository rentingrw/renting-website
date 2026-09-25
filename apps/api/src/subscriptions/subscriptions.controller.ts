import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { InitiateSubscriptionDto } from './dto/initiate-subscription.dto';
import { InitiateDriverSubscriptionDto } from './dto/initiate-driver-subscription.dto';
import { InitiateTaxiSubscriptionDto } from './dto/initiate-taxi-subscription.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List hoster, driver, and taxi subscription plans' })
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('initiate')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Initiate a new car-owner subscription payment' })
  initiate(@CurrentUser() user: AuthenticatedUser, @Body() payload: InitiateSubscriptionDto) {
    return this.subscriptionsService.initiate(user, payload);
  }

  @Get('callback/ipay')
  @SkipThrottle()
  @ApiOperation({ summary: 'Receive iPay/MoPay payment callback' })
  handleIPayCallback(
    @Query('transactionId') queryTxId?: string,
    @Query('status') queryStatus?: string,
    @Body() body?: { transactionId?: string; amount?: number; status?: number },
  ) {
    const transactionId = (body?.transactionId ?? queryTxId) as string;
    const status = Number(body?.status ?? queryStatus ?? 0);
    return this.subscriptionsService.handleIPayCallback(transactionId, status);
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

  @Get('taxi/history')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history for taxi subscriptions' })
  getTaxiPaymentHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getTaxiPaymentHistory(user);
  }

  @Post('taxi/initiate')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Initiate a taxi driver subscription payment' })
  initiateTaxi(@CurrentUser() user: AuthenticatedUser, @Body() payload: InitiateTaxiSubscriptionDto) {
    return this.subscriptionsService.initiateTaxi(user, payload);
  }

  @Get('taxi/me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the active taxi subscription for the authenticated user' })
  getTaxiSubscriptionMine(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getTaxiSubscriptionMine(user);
  }

  @Post('taxi/cancel')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel the authenticated user\'s taxi subscription' })
  cancelTaxiSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.cancelTaxiSubscription(user);
  }
}

