import { Module } from '@nestjs/common';

import { CarsModule } from '../cars/cars.module';
import { TaxiDriversController } from './taxi-drivers.controller';
import { TaxiDriversService } from './taxi-drivers.service';

@Module({
  imports: [CarsModule],
  controllers: [TaxiDriversController],
  providers: [TaxiDriversService],
})
export class TaxiDriversModule {}
