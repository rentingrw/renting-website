import { Module } from '@nestjs/common';

import { CarsModule } from '../cars/cars.module';
import { DisputesModule } from '../disputes/disputes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [CarsModule, TrustScoreModule, DisputesModule, NotificationsModule, UsersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
