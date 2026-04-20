import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CarsService } from '../cars/cars.service';
import { GetUploadUrlDto } from '../cars/dto/get-upload-url.dto';

@ApiTags('Uploads')
@Controller()
export class UploadsController {
  constructor(private readonly carsService: CarsService) {}

  @Post('upload-url')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a signed URL for uploading an image to cloud storage (max 10 MB, images only)' })
  getUploadUrl(@Body() payload: GetUploadUrlDto) {
    return this.carsService.getSignedUploadUrl(payload.folder);
  }
}
