import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('status')
  getStatus() {
    return this.telegramService.getStatus();
  }

  @Post('test-alert')
  @UseGuards(JwtAuthGuard)
  async sendTestAlert(@Body() body: { title?: string; message?: string }) {
    const success = await this.telegramService.sendSessionAlert({
      companyBadge: {
        code: 'A',
        letterArabic: 'أ',
        name: 'المجموعة الذهبية للتوريدات والمقاولات',
        shortName: 'جولدن',
        fullTitle: 'الشركة (أ) — المجموعة الذهبية للتوريدات والمقاولات (جولدن)',
        emoji: '🥇',
      },
      operationCode: 'A15',
      operationName: 'عملية تجريبية لفحص إشعارات تليجرام',
      authority: 'الهيئة العامة للأبنية التعليمية',
      sessionType: 'جلسة فتح المظاريف الفنية',
      sessionDate: 'اليوم — 11:00 صباحاً',
      location: 'مقر الهيئة الرئيسي - مدينة نصر',
    });

    return {
      success,
      message: success ? 'تم إرسال التنبيه التجريبي إلى تليجرام بنجاح' : 'لم يتم إرسال التنبيه، تأكد من ربط الحساب أولاً',
    };
  }
}
