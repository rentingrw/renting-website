import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OptionalClerkAuthGuard } from '../auth/guards/optional-clerk-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { ImageUploadService } from '../uploads/image-upload.service';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { SetListingStatusDto } from './dto/set-listing-status.dto';

@ApiTags('Cars')
@Controller('cars')
export class CarsController {
  constructor(
    private readonly carsService: CarsService,
    private readonly imageUploadService: ImageUploadService,
  ) {}

  @Post()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new car listing' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() payload: CreateCarDto) {
    return this.carsService.create(user, payload);
  }

  @Patch(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing car listing' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() payload: UpdateCarDto) {
    return this.carsService.update(user, id, payload);
  }

  @Delete(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a car listing' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.carsService.remove(user, id);
  }

  @Post(':id/publish')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a car listing to make it publicly visible' })
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.carsService.publish(user, id);
  }

  @Post(':id/pause')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause a car listing to hide it from search results' })
  pause(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.carsService.pause(user, id);
  }

  @Patch(':id/status')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set listing visibility: active, inactive, or booked' })
  setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() payload: SetListingStatusDto,
  ) {
    return this.carsService.setListingStatus(user, id, payload.status);
  }

  @Get('mine')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all car listings owned by the authenticated user' })
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.carsService.getMine(user);
  }

  @Post('upload-url')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a signed upload URL for a car image' })
  getUploadUrl(@Body() payload: GetUploadUrlDto) {
    return this.imageUploadService.getUploadConfig(payload.folder);
  }

  @Get('by-owner/:userId')
  @UseGuards(OptionalClerkAuthGuard)
  @ApiOperation({ summary: 'Get listings by owner user ID (active only for public; all for owner when signed in)' })
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=60')
  getByOwner(
    @Param('userId') userId: string,
    @Query('excludeId') excludeId?: string,
    @Req() request?: { user?: AuthenticatedUser },
  ) {
    return this.carsService.getByOwner(userId, excludeId, request?.user);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get availability calendar for a car in a given month' })
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
  getAvailability(@Param('id') id: string, @Query() query: GetAvailabilityDto) {
    return this.carsService.getAvailability(id, query.month);
  }

  @Get(':id')
  @UseGuards(OptionalClerkAuthGuard)
  @ApiOperation({ summary: 'Get a car listing by ID' })
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=60')
  getById(@Param('id') id: string, @Req() request: { user?: AuthenticatedUser }) {
    return this.carsService.getById(id, request.user);
  }
}
