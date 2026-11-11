import { Module } from '@nestjs/common';

import { ImageUploadModule } from '../uploads/image-upload.module';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';

@Module({
  imports: [ImageUploadModule],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService, ImageUploadModule],
})
export class CarsModule {}
