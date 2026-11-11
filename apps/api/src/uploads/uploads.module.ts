import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ImageUploadModule } from './image-upload.module';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [AuthModule, ImageUploadModule],
  controllers: [UploadsController],
  exports: [ImageUploadModule],
})
export class UploadsModule {}
