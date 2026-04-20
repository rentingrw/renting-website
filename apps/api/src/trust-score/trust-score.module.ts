import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { TrustScoreController } from './trust-score.controller';
import { TrustScoreService } from './trust-score.service';

@Module({
  imports: [NotificationsModule],
  controllers: [TrustScoreController],
  providers: [TrustScoreService],
  exports: [TrustScoreService],
})
export class TrustScoreModule {}
