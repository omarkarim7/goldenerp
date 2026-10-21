import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync, createReadStream } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot() {
    return {
      status: 'online',
      name: 'GoldenERP Production API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('public-doc/:fileName')
  async getPublicDoc(@Param('fileName') fileName: string, @Res() res: Response) {
    const safeName = decodeURIComponent(fileName).replace(/[^a-zA-Z0-9_\-\.]/g, '');
    const searchDirs = [
      path.resolve(process.cwd(), 'uploads', 'cloud_docs'),
      path.resolve(process.cwd(), '..', 'uploads', 'cloud_docs'),
      path.resolve(process.cwd(), '..', 'frontend', 'public', 'cloud_docs'),
      path.resolve(os.tmpdir(), 'cloud_docs'),
      path.resolve(process.cwd(), 'uploads'),
    ];

    for (const dir of searchDirs) {
      const p = path.resolve(dir, safeName);
      if (existsSync(p)) {
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${safeName}"`,
          'Cache-Control': 'public, max-age=86400',
        });
        const stream = createReadStream(p);
        return stream.pipe(res);
      }
    }

    throw new NotFoundException('المستند الرقمي غير موجود أو انتهت صلاحية الرابط');
  }
}

