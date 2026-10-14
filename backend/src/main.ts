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
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow any origin (including Vercel subdomains, localhost, custom domains)
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-CSRF-Token'],
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
  const origin = req.headers.origin || 'https://goldenerp-tau.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
