import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';

import { AppModule } from './app.module';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisIoAdapter = new RedisIoAdapter(app);
  try {
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  } catch {
    // Redis unavailable (e.g. NOAUTH, connection refused) — use in-memory adapter (single instance)
    process.stdout.write(
      'Redis not available, using in-memory Socket.io adapter. Add REDIS_URL with password for production.\n',
    );
  }

  app.enableCors({
    origin: [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_ADMIN_URL].filter(Boolean),
    credentials: true,
  });

  app.use('/webhooks/clerk', express.raw({ type: 'application/json' }));
  app.use('/subscriptions/webhook/flutterwave', express.json());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('renting.rw API')
    .setDescription('renting.rw platform API — car rentals, driver bookings, subscriptions and marketplace management')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('/api/docs', app, swaggerDocument);

  await app.listen(process.env.PORT || 3001);
}

bootstrap();
