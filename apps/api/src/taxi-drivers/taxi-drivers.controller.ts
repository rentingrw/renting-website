import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { ImageUploadService } from '../uploads/image-upload.service';
import { RegisterTaxiDriverDto } from './dto/register-taxi-driver.dto';
import { SetTaxiStatusDto } from './dto/set-taxi-status.dto';
import { TaxiDriversService } from './taxi-drivers.service';

@Controller('taxi-drivers')
export class TaxiDriversController {
  constructor(
    private readonly taxiDriversService: TaxiDriversService,
    private readonly imageUploadService: ImageUploadService,
  ) {}

  @Get('upload-url')
  getUploadUrl(@Query('folder') folder?: string) {
    return this.imageUploadService.getUploadConfig(folder);
  }

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.taxiDriversService.getMine(user);
  }

  @Patch('me')
  @UseGuards(ClerkAuthGuard)
  updateMine(@CurrentUser() user: AuthenticatedUser, @Body() body: RegisterTaxiDriverDto) {
    return this.taxiDriversService.updateMine(user, body);
  }

  @Patch('me/status')
  @UseGuards(ClerkAuthGuard)
  setMineStatus(@CurrentUser() user: AuthenticatedUser, @Body() body: SetTaxiStatusDto) {
    return this.taxiDriversService.setMineStatus(user, body.status);
  }

  @Get()
  list(@Query('city') city?: string) {
    return this.taxiDriversService.list(city);
  }

  @Get(':id')
  getPublicById(@Param('id', ParseUUIDPipe) id: string) {
    return this.taxiDriversService.getPublicById(id);
  }

  @Post('register')
  @UseGuards(ClerkAuthGuard)
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  register(@Body() body: RegisterTaxiDriverDto, @CurrentUser() user: AuthenticatedUser) {
    return this.taxiDriversService.register(body, user);
  }
}
