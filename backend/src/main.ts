import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';

const server: Express = express();
let cachedApp: INestApplication | null = null;

export async function bootstrap(expressInstance?: Express) {
  const adapter = expressInstance ? new ExpressAdapter(expressInstance) : undefined;
  const app = adapter
    ? await NestFactory.create(AppModule, adapter)
    : await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: true, // Allow all origins (Vercel, custom domain, localhost) with credentials
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  // Global prefix
  app.setGlobalPrefix('api', { exclude: ['/'] });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  return app;
}

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    cachedApp = await bootstrap(server);
  }
  server(req, res);
}

// Standalone server execution for local development
if (!process.env.VERCEL) {
  const app = await bootstrap();
  const port = Number(process.env.PORT) || Number(process.env.APP_PORT) || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 GoldenERP Backend running on port ${port}`);
}
