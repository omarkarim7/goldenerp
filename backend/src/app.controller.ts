import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync, createReadStream } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

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

    // المستند غير موجود على القرص المحلي (مثل استضافة Vercel أو الخوادم السحابية)
    // نبحث عن رابط السحابة المعتمد (Catbox / Tmpfile) في قاعدة البيانات
    const frontendUrl = process.env.FRONTEND_URL || 'https://goldenerp-tau.vercel.app';
    const regMatch = safeName.match(/([a-zA-Z]{1,4}\d{6,14})/i);
    const regNo = regMatch ? regMatch[1] : null;

    try {
      if (regNo) {
        const op = await this.prisma.operation.findFirst({
          where: {
            OR: [
              { notes: { contains: regNo } },
              { externalNumber: { contains: regNo } },
            ],
          },
        });

        if (op && op.notes) {
          try {
            const notesObj = JSON.parse(op.notes);
            const candidateUrls: string[] = [];
            const collectUrls = (obj: any) => {
              if (!obj || typeof obj !== 'object') return;
              if (obj.cloudUrls && typeof obj.cloudUrls === 'object') {
                for (const u of Object.values(obj.cloudUrls)) {
                  if (typeof u === 'string' && u.startsWith('http') && !u.includes('public-doc')) {
                    candidateUrls.push(u);
                  }
                }
              }
              if (typeof obj.cloudPdfUrl === 'string' && obj.cloudPdfUrl.startsWith('http') && !obj.cloudPdfUrl.includes('public-doc')) {
                candidateUrls.push(obj.cloudPdfUrl);
              }
              for (const v of Object.values(obj)) {
                if (typeof v === 'object') collectUrls(v);
              }
            };
            collectUrls(notesObj);

            let targetUrl = candidateUrls[0];
            for (const u of candidateUrls) {
              if (safeName.includes('booklet') && (u.includes('booklet') || candidateUrls.length === 1)) {
                targetUrl = u;
                break;
              }
              if (safeName.includes('technical') && u.includes('technical')) {
                targetUrl = u;
                break;
              }
              if (safeName.includes('financial') && u.includes('financial')) {
                targetUrl = u;
                break;
              }
              if (safeName.includes('clarification') && u.includes('clarification')) {
                targetUrl = u;
                break;
              }
              if (safeName.includes('guarantee') && u.includes('guarantee')) {
                targetUrl = u;
                break;
              }
            }

            if (targetUrl) {
              return res.redirect(302, targetUrl);
            }
          } catch {}
        }
      }
    } catch (dbErr) {
      console.warn('Could not query prisma for public-doc redirect:', dbErr);
    }

    // إذا لم يتوفر رابط سحابي مباشر بعد، توجيه المستخدم لصفحة التحقق الرسمية بدلاً من رسالة 404
    return res.redirect(302, `${frontendUrl}/verify-doc?ref=${encodeURIComponent(regNo || safeName)}`);
  }
}
