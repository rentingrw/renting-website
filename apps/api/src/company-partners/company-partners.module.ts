import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompanyPartnersController } from './company-partners.controller';
import { CompanyPartnersService } from './company-partners.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [CompanyPartnersController],
  providers: [CompanyPartnersService],
  exports: [CompanyPartnersService],
})
export class CompanyPartnersModule {}