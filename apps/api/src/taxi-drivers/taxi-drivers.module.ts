import { Module } from '@nestjs/common';
import { TaxiDriversController } from './taxi-drivers.controller';
import { TaxiDriversService } from './taxi-drivers.service';

@Module({
  controllers: [TaxiDriversController],
  providers: [TaxiDriversService],
})
export class TaxiDriversModule {}
