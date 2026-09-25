import { Module } from '@nestjs/common';

import { CarsModule } from '../cars/cars.module';
import { DisputesModule } from '../disputes/disputes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { UsersModule } from '../users/users.module';
import { BookingsModule } from '../bookings/bookings.module';
import { DriverBookingsModule } from '../driver-bookings/driver-bookings.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { BannersPublicController } from './banners-public.controller';

@Module({
  imports: [CarsModule, TrustScoreModule, DisputesModule, NotificationsModule, UsersModule, BookingsModule, DriverBookingsModule],
  controllers: [AdminController, BannersPublicController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
