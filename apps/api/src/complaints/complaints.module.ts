import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { ComplaintsPublicController } from './complaints-public.controller';
import { ComplaintsService } from './complaints.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ComplaintsPublicController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}