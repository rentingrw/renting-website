import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [TrustScoreModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
