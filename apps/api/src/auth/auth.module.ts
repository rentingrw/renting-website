import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { OptionalClerkAuthGuard } from './guards/optional-clerk-auth.guard';

@Module({
  imports: [NotificationsModule],
  controllers: [AuthController],
  providers: [AuthService, ClerkAuthGuard, OptionalClerkAuthGuard, AdminGuard],
  exports: [AuthService, ClerkAuthGuard, OptionalClerkAuthGuard, AdminGuard],
})
export class AuthModule {}
