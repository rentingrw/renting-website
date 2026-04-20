import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { CronService } from './cron.service';

@Module({
  imports: [TrustScoreModule, NotificationsModule],
  providers: [CronService],
})
export class CronModule {}
