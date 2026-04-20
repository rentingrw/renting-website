import { Controller, Get, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { autocomplete, geocode, reverseGeocode } from './nominatim.service';

@ApiTags('Geocoding')
@Controller('geocode')
@SkipThrottle()
export class GeocodingController {
  @Get()
  @ApiOperation({ summary: 'Forward geocode an address query to coordinates' })
  async forward(@Query('q') q?: string) {
    const result = await geocode(q?.trim() ?? '');
    return result;
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete address suggestions' })
  async autocompleteHandler(@Query('q') q?: string) {
    return autocomplete(q?.trim() ?? '');
  }

  @Get('reverse')
  @ApiOperation({ summary: 'Reverse geocode coordinates to an address' })
  async reverse(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
  ) {
    const latitude = Number(lat ?? NaN);
    const longitude = Number(lon ?? NaN);
    const result = await reverseGeocode(latitude, longitude);
    return result;
  }
}
