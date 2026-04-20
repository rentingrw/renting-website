import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

import { AppModule } from '../src/app.module';

const server = express();

let app: Awaited<ReturnType<typeof NestFactory.create>> | null = null;

async function bootstrap() {
  if (app) return app;

  app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
  });

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_ADMIN_URL,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow exact matches
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow all Vercel preview deployments for rentingrw
      if (/^https:\/\/renting(i|rw|-).*\.vercel\.app$/.test(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  app.use('/webhooks/clerk', express.raw({ type: 'application/json' }));
  app.use('/subscriptions/webhook/flutterwave', express.json());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.init();
  return app;
}

export default async function handler(req: express.Request, res: express.Response) {
  await bootstrap();
  server(req, res);
}
