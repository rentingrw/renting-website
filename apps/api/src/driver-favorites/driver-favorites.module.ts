import { Module } from '@nestjs/common';
import { DriverFavoritesController } from './driver-favorites.controller';
import { DriverFavoritesService } from './driver-favorites.service';

@Module({
  controllers: [DriverFavoritesController],
  providers: [DriverFavoritesService],
})
export class DriverFavoritesModule {}
