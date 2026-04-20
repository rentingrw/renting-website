import { Module } from '@nestjs/common';

import { CarsModule } from '../cars/cars.module';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [CarsModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
