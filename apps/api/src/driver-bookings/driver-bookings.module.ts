import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { DriverBookingsController } from './driver-bookings.controller';
import { DriverBookingsService } from './driver-bookings.service';

@Module({
  imports: [TrustScoreModule, NotificationsModule],
  controllers: [DriverBookingsController],
  providers: [DriverBookingsService],
})
export class DriverBookingsModule {}
