import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { z } from 'zod';

/** Resolve .env path: try monorepo root then package dir (API runs from apps/api) */
function getEnvFilePath(): string[] {
  const candidates = [
    join(process.cwd(), '.env'),
    join(process.cwd(), '..', '..', '.env'),
  ];
  return candidates.filter((p) => existsSync(p));
}

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CronModule } from './cron/cron.module';
import { BookingsModule } from './bookings/bookings.module';
import { CarsModule } from './cars/cars.module';
import { DisputesModule } from './disputes/disputes.module';
import { DriverBookingsModule } from './driver-bookings/driver-bookings.module';
import { DriversModule } from './drivers/drivers.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { HealthModule } from './health/health.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SearchModule } from './search/search.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TrustScoreModule } from './trust-score/trust-score.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z
    .string()
    .min(1)
    .transform((v) => (v.startsWith('redis') ? v : `redis://${v}`)),
  CLERK_SECRET_KEY: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  CLERK_WEBHOOK_SECRET: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  CLOUDINARY_API_KEY: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  AT_API_KEY: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  AT_USERNAME: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  RESEND_API_KEY: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  MTN_MOMO_BASE_URL: isProduction ? z.string().url() : z.string().url().optional(),
  MTN_MOMO_SUBSCRIPTION_KEY: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  MTN_MOMO_API_USER: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  MTN_MOMO_API_KEY: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  MTN_MOMO_WEBHOOK_SECRET: z.string().min(1).optional(),
  AIRTEL_BASE_URL: isProduction ? z.string().url() : z.string().url().optional(),
  AIRTEL_CLIENT_ID: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  AIRTEL_CLIENT_SECRET: isProduction ? z.string().min(1) : z.string().min(1).optional(),
  AIRTEL_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_ADMIN_URL: z.string().url().optional().default('http://localhost:3002'),
  NEXT_PUBLIC_API_URL: z.string().url().optional().default('http://localhost:3001'),
});

function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map(({ path, message }) => `${path.join('.')}: ${message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return parsed.data;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath().length ? getEnvFilePath() : undefined,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 }, // 120 req/min per IP by default
      { name: 'strict', ttl: 60_000, limit: 10 },   // for auth/payment endpoints
    ]),
    ScheduleModule.forRoot(),
    CronModule,
    HealthModule,
    AdminModule,
    AuthModule,
    UsersModule,
    CarsModule,
    DriversModule,
    BookingsModule,
    DriverBookingsModule,
    TrustScoreModule,
    RealtimeModule,
    NotificationsModule,
    MessagesModule,
    ReviewsModule,
    DisputesModule,
    GeocodingModule,
    SearchModule,
    SubscriptionsModule,
    UploadsModule,
    WebhooksModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
