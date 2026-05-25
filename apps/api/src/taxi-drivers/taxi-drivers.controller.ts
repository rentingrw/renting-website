import { Body, Controller, Get, Post, Query, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { RegisterTaxiDriverDto } from './dto/register-taxi-driver.dto';
import { TaxiDriversService } from './taxi-drivers.service';

@Controller('taxi-drivers')
export class TaxiDriversController {
  constructor(private readonly taxiDriversService: TaxiDriversService) {}

  @Get()
  list(@Query('city') city?: string) {
    return this.taxiDriversService.list(city);
  }

  @Post('register')
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  register(@Body(ValidationPipe) body: RegisterTaxiDriverDto) {
    return this.taxiDriversService.register(body);
  }
}
