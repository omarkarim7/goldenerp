import fs from 'fs';
import path from 'path';

// Automatically load .env if present
const envFiles = [
  path.resolve(process.cwd(), '.env'),
  '/home/u179759652/domains/api.ahdahd.eu/hbuilds/config/.env',
  path.resolve(process.cwd(), '../config/.env'),
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
    break;
  }
}

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
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Standalone server execution for Hostinger / local
if (!process.env.VERCEL) {
  bootstrap()
    .then(async (app) => {
      const port = Number(process.env.PORT) || Number(process.env.APP_PORT) || 4000;
      await app.listen(port, '0.0.0.0');
      console.log(`🚀 GoldenERP Backend running on port ${port}`);
    })
    .catch((err) => {
      console.error('❌ Failed to start server:', err);
      process.exit(1);
    });
}
