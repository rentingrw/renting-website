import { Module } from '@nestjs/common';

import { GeocodingController } from './geocoding.controller';

@Module({
  controllers: [GeocodingController],
})
export class GeocodingModule {}
