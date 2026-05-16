import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

import { AppModule } from '../src/app.module';
import { buildCorsOptions } from '../src/cors';

const server = express();

let app: Awaited<ReturnType<typeof NestFactory.create>> | null = null;

async function bootstrap() {
  if (app) return app;

  app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
  });

  app.enableCors(buildCorsOptions());

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
