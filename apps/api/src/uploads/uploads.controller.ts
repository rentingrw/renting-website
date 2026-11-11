import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { GetUploadUrlDto } from '../cars/dto/get-upload-url.dto';
import { ImageUploadService } from './image-upload.service';

@ApiTags('Uploads')
@Controller()
export class UploadsController {
  constructor(private readonly imageUploadService: ImageUploadService) {}

  @Post('upload-url')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a signed URL for uploading an image to cloud storage (max 10 MB, images only)' })
  getUploadUrl(@Body() payload: GetUploadUrlDto) {
    return this.imageUploadService.getUploadConfig(payload.folder);
  }

  @Post('uploads/direct')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Local dev image upload when Cloudinary is not configured' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  directUpload(@UploadedFile() file: Express.Multer.File) {
    return this.imageUploadService.saveLocalDevFile(file);
  }
}
