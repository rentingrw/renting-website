import { Module } from '@nestjs/common';

import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [RealtimeModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
