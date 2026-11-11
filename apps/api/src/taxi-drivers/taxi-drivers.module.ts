import { Module } from '@nestjs/common';

import { ImageUploadModule } from '../uploads/image-upload.module';
import { TaxiDriversController } from './taxi-drivers.controller';
import { TaxiDriversService } from './taxi-drivers.service';

@Module({
  imports: [ImageUploadModule],
  controllers: [TaxiDriversController],
  providers: [TaxiDriversService],
})
export class TaxiDriversModule {}
