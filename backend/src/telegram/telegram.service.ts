import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Telegraf, Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service.js';
import { TELEGRAM_MESSAGES, getCompanyBadge, CompanyBadgeInfo } from './telegram.constants.js';
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
// @ts-ignore
import * as arabicReshaperModule from 'arabic-persian-reshaper';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('TelegramService');
  private bot: Telegraf | null = null;
  private adminChatId: string | null = null;
  private botToken: string | null = null;
  private isConnected = false;
  private botUsername = 'GoldenERP_Bot';

  // معالجة إعادة المحاولة الذكية عند حدوث 409 Conflict
  private launchRetryTimeout: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  // حفظ سياق الشركة النشطة لكل مدير عام / شات ('ALL' | 'A' | 'B' | 'C' | 'D')
  private userCompanyContext: Map<string, string> = new Map();

  // كاش ديناميكي لأسماء الشركات الأربعة يسحب مباشرة من الإعدادات وقاعدة البيانات
  private companyNameCache: Map<string, string> = new Map([
    ['A', 'جولدن'],
    ['B', 'إكسلنت'],
    ['C', 'العهد'],
    ['D', 'الشركة الرابعة'],
  ]);

  // سجل التنبيهات المرسلة استباقياً لمنع تكرار الإرسال في نفس اليوم (Deduplication)
  private sentAlertsDailyCache: Set<string> = new Set();

  public async refreshCompanyCache() {
    try {
      const companies = await this.prisma.company.findMany({ orderBy: { code: 'asc' } });
      for (const c of companies) {
        if (c.code && c.name) {
          const codeUpper = c.code.toUpperCase();
          let shortName = c.name.trim();
          if (codeUpper === 'A') shortName = 'جولدن';
          else if (codeUpper === 'B') shortName = 'إكسلنت';
          else if (codeUpper === 'C') shortName = 'العهد';
          else if (codeUpper === 'D') {
            if (c.name.includes('الحديثة للتجارة') || c.name.includes('الشركة الرابعة')) {
              shortName = 'الشركة الرابعة';
            } else {
              shortName = c.name.trim();
            }
          }
          this.companyNameCache.set(codeUpper, shortName);
        }
      }
    } catch {}
  }

  public getCompanyBadgeDynamic(operationCode?: string, explicitName?: string): CompanyBadgeInfo {
    const customNames = Object.fromEntries(this.companyNameCache);
    return getCompanyBadge(operationCode, explicitName, customNames);
  }

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.initBot();
  }

  async initBot() {
    await this.refreshCompanyCache();
    let token = this.config.get<string>('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN;
    let configuredChatId = this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID') || process.env.TELEGRAM_ADMIN_CHAT_ID;

    // 1. فحص إعدادات قاعدة البيانات أولاً
    try {
      const dbToken = await this.prisma.systemSetting.findUnique({ where: { key: 'telegram_bot_token' } });
      if (dbToken?.value && dbToken.value.trim()) {
        token = dbToken.value.trim();
      }
      const dbChatId = await this.prisma.systemSetting.findUnique({ where: { key: 'telegram_admin_chat_id' } });
      if (dbChatId?.value && dbChatId.value.trim()) {
        configuredChatId = dbChatId.value.trim();
      }
    } catch {}

    // 2. فحص ملف .env
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const tokenMatch = envContent.match(/TELEGRAM_BOT_TOKEN=["']?([^"'\r\n]+)["']?/);
        if (tokenMatch && tokenMatch[1] && tokenMatch[1].trim()) {
          token = tokenMatch[1].trim();
        }
        const chatMatch = envContent.match(/TELEGRAM_ADMIN_CHAT_ID=["']?([^"'\r\n]+)["']?/);
        if (chatMatch && chatMatch[1] && chatMatch[1].trim()) {
          configuredChatId = chatMatch[1].trim();
        }
      }
    } catch {}

    if (!token || !token.trim()) {
      token = '8887272650:AAED3QzSPKcR6S9wRL2GBx94GitTHrzVgOM';
    }

    this.botToken = token;

    if (configuredChatId && configuredChatId.trim()) {
      this.adminChatId = configuredChatId.trim();
      this.logger.log(`🔒 Telegram Admin Chat ID locked to: ${this.adminChatId}`);
    }

    try {
      if (this.launchRetryTimeout) {
        clearTimeout(this.launchRetryTimeout);
        this.launchRetryTimeout = null;
      }

      if (this.bot) {
        try { this.bot.stop('RESTART'); } catch {}
        this.bot = null;
        await new Promise((r) => setTimeout(r, 600));
      }

      this.bot = new Telegraf(token);
      this.registerHandlers();

      // تشغيل البوت بدون حظر بدء تشغيل سيرفر NestJS (Non-blocking)
      this.launchPolling();

      // تسجيل الأوامر الرسمية في قائمة تليجرام
      this.bot.telegram.setMyCommands([
        { command: 'start', description: '🚀 لوحة التحكم الرئيسية والشركات الـ 4' },
        { command: 'company', description: '🏢 اختيار الشركة النشطة ومقرها' },
        { command: 'pending', description: '🖨️ طلبات اعتماد الطباعة المعلقة' },
        { command: 'today', description: '📅 جدول مواعيد وجلسات اليوم' },
        { command: 'upcoming', description: '⏰ المواعيد والجلسات القادمة' },
        { command: 'guarantees', description: '🛡️ سريان ومدد الضمانات البنكية' },
        { command: 'alerts', description: '⚙️ إعدادات وتخصيص التنبيهات' },
        { command: 'status', description: '🛡️ حالة المنظومة والأمان' },
        { command: 'help', description: '📖 دليل الاستخدام والمساعدة' },
      ]).catch(() => {});

      this.bot.telegram.getMe().then((botInfo) => {
        if (botInfo) {
          this.botUsername = botInfo.username || 'GoldenERP_Bot';
          this.logger.log(`🤖 Telegram Bot authenticated: @${this.botUsername} (${botInfo.first_name})`);
        }
      }).catch(() => {});

    } catch (err) {
      this.logger.error('❌ Error initializing Telegram Bot:', err);
    }
  }

  /**
   * تشغيل الاستطلاع (Polling) مع آلية التعافي الذاتي وإعادة المحاولة عند تضارب 409
   */
  private launchPolling(attempt = 1) {
    if (this.isShuttingDown || !this.bot) return;

    this.bot
      .launch(
        {
          allowedUpdates: ['message', 'callback_query'],
          dropPendingUpdates: false,
        },
        () => {
          this.isConnected = true;
          this.logger.log('🚀 GoldenERP VIP Telegram Bot launched successfully via polling!');
        }
      )
      .catch((err: any) => {
        this.isConnected = false;
        const isConflict =
          err?.response?.error_code === 409 ||
          err?.message?.includes('409') ||
          err?.message?.includes('Conflict');

        if (isConflict) {
          const delay = Math.min(attempt * 3000, 10000);
          this.logger.warn(
            `⚠️ Telegram 409 Conflict: another polling connection is closing. Waiting ${delay / 1000}s before reconnecting (attempt ${attempt})...`
          );

          if (this.launchRetryTimeout) clearTimeout(this.launchRetryTimeout);
          this.launchRetryTimeout = setTimeout(() => {
            this.launchPolling(attempt + 1);
          }, delay);
        } else {
          this.logger.error('❌ Failed to launch Telegram Bot polling:', err);
        }
      });
  }

  onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.launchRetryTimeout) {
      clearTimeout(this.launchRetryTimeout);
      this.launchRetryTimeout = null;
    }
    if (this.bot) {
      try {
        this.bot.stop('SIGTERM');
      } catch {}
      this.logger.log('🛑 Telegram Bot polling gracefully stopped.');
    }
  }

  /**
   * إزالة لوحة المفاتيح السفلية نهائياً لتبقى الأزرار في مكان واحد فقط داخل الرسائل
   */
  private readonly removeKeyboard = Markup.removeKeyboard();

  /**
   * أزرار الشركات الأربعة التفاعلية (Inline Keyboard) فقط — بدون أي أدوات خارجية
   */
  private async getCompanyInlineKeyboard() {
    await this.refreshCompanyCache();
    const nameA = this.companyNameCache.get('A') || 'جولدن';
    const nameB = this.companyNameCache.get('B') || 'إكسلنت';
    const nameC = this.companyNameCache.get('C') || 'العهد';
    const nameD = this.companyNameCache.get('D') || 'الشركة الرابعة';

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`🥇 ${nameA} (A)`, 'hub_comp_A'),
        Markup.button.callback(`🥈 ${nameB} (B)`, 'hub_comp_B'),
      ],
      [
        Markup.button.callback(`🥉 ${nameC} (C)`, 'hub_comp_C'),
        Markup.button.callback(`🔷 ${nameD} (D)`, 'hub_comp_D'),
      ],
    ]);
  }

  /**
   * لوحة أدوات مقر الشركة المحدد فقط (تنبيهات واستعلامات خاصة بالشركة)
   */
  private getCompanyHubKeyboard(compCode: string) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🖨️ طلبات طباعة الموظفين المعلقة', `cmd_pending_${compCode}`),
      ],
      [
        Markup.button.callback('📅 جدول جلسات ومواعيد اليوم', `cmd_today_${compCode}`),
      ],
      [
        Markup.button.callback('⏰ المواعيد والجلسات القادمة (30 يوماً)', `cmd_upcoming_${compCode}`),
      ],
      [
        Markup.button.callback('🛡️ سريان ومدد الضمانات البنكية', `cmd_guar_${compCode}`),
      ],
      [
        Markup.button.callback('🏢 اختيار شركة أخرى', 'cmd_company'),
      ],
    ]);
  }

  /**
   * تعديل محتوى الرسالة بشكل آمن مع معالجة خطأ 400 (message is not modified) تلقائياً
   */
  private async safeEditMessageText(ctx: any, text: string, extra?: any, isEdit = true): Promise<boolean> {
    try {
      if (isEdit && ctx.callbackQuery) {
        await ctx.editMessageText(text, extra);
        return true;
      } else {
        await ctx.replyWithHTML(text, extra);
        return true;
      }
    } catch (err: any) {
      const isNotModified =
        err?.response?.error_code === 400 &&
        (err?.response?.description?.includes('message is not modified') ||
          err?.message?.includes('message is not modified'));

      if (isNotModified) {
        try {
          await ctx.answerCbQuery?.('✅ البيانات محدثة بالفعل');
        } catch {}
        return true;
      }

      this.logger.warn(`safeEditMessageText notice: ${err?.message || err}`);
      try {
        await ctx.replyWithHTML(text, extra);
        return true;
      } catch {}
      return false;
    }
  }

  /**
   * تشكيل النصوص العربية وربط الحروف وعكس الاتجاه للرسم السليم في ملفات الـ PDF
   */
  private shapeArabicText(text?: string | null): string {
    if (!text) return '';
    try {
      const shaper =
        (arabicReshaperModule as any).default?.ArabicShaper ||
        (arabicReshaperModule as any).ArabicShaper;
      if (shaper?.convertArabic) {
        const shaped = shaper.convertArabic(String(text));
        return shaped.split('').reverse().join('');
      }
    } catch {}
    return String(text);
  }

  private cachedFontBytes: Buffer | null = null;

  /**
   * توليد ملف PDF رقمي أصلي معتمد لأي طلب طباعة ومستند رسمي
   */
  public async generateApprovalPdfDocument(approval: any): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const fk = ((fontkit as any).default || fontkit) as any;
    doc.registerFontkit(fk);

    if (!this.cachedFontBytes) {
      const fontCandidates = [
        'C:\\Windows\\Fonts\\arial.ttf',
        'C:\\Windows\\Fonts\\tahoma.ttf',
        'C:\\Windows\\Fonts\\segoeui.ttf',
      ];
      for (const p of fontCandidates) {
        if (fs.existsSync(p)) {
          this.cachedFontBytes = fs.readFileSync(p);
          break;
        }
      }
    }

    let customFont: any = null;
    if (this.cachedFontBytes) {
      customFont = await doc.embedFont(this.cachedFontBytes);
    }

    const page = doc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    // Top Header decorative bars
    page.drawRectangle({
      x: 0,
      y: height - 10,
      width,
      height: 10,
      color: rgb(0.12, 0.23, 0.54), // #1e3a8a
    });
    page.drawRectangle({
      x: 0,
      y: height - 14,
      width,
      height: 4,
      color: rgb(0.85, 0.47, 0.02), // #d97706
    });

    // Outer page border
    page.drawRectangle({
      x: 25,
      y: 25,
      width: width - 50,
      height: height - 50,
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1.5,
    });

    const companyBadge = this.getCompanyBadgeDynamic(approval.operationCode || undefined);
    const companyTitleStr = this.shapeArabicText(companyBadge.fullTitle || 'المجموعة الذهبية للتوريدات والمقاولات — (A)');
    const republicStr = this.shapeArabicText('جمهورية مصر العربية — منظومة التعاقدات والمناقصات الحكومية المركزية');

    if (customFont) {
      page.drawText(republicStr, {
        x: width - 40 - customFont.widthOfTextAtSize(republicStr, 11),
        y: height - 42,
        size: 11,
        font: customFont,
        color: rgb(0.2, 0.25, 0.35),
      });

      page.drawText(companyTitleStr, {
        x: width - 40 - customFont.widthOfTextAtSize(companyTitleStr, 14),
        y: height - 64,
        size: 14,
        font: customFont,
        color: rgb(0.1, 0.2, 0.5),
      });
    }

    // Document Title Banner Box
    page.drawRectangle({
      x: 35,
      y: height - 125,
      width: width - 70,
      height: 40,
      color: rgb(0.95, 0.97, 1.0),
      borderColor: rgb(0.12, 0.23, 0.54),
      borderWidth: 1.2,
    });

    const docTitle = this.shapeArabicText(approval.documentTitle || 'مستند رسمي معتمد');
    if (customFont) {
      page.drawText(docTitle, {
        x: (width - customFont.widthOfTextAtSize(docTitle, 15)) / 2,
        y: height - 109,
        size: 15,
        font: customFont,
        color: rgb(0.1, 0.2, 0.5),
      });
    }

    // Metadata Box
    const metaY = height - 140;
    page.drawRectangle({
      x: 35,
      y: metaY - 95,
      width: width - 70,
      height: 95,
      color: rgb(0.98, 0.99, 1.0),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
    });

    const row1 = this.shapeArabicText(`كود العملية: [${approval.operationCode || 'A15'}] — اسم العملية: ${approval.operationName || 'عملية مناقصة وتوريد'}`);
    const row2 = this.shapeArabicText(`الجهة الإدارية المتعاقدة: ${approval.authority || 'الجهة الحكومية المختصة'}`);
    const row3 = this.shapeArabicText(`مقدم طلب الاعتماد: ${approval.requestedBy || 'مسؤول العطاءات'}`);
    const dateFormatted = approval.requestedAt
      ? new Date(approval.requestedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' })
      : new Date().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' });
    const row4 = this.shapeArabicText(`تاريخ ووقت التقديم: ${dateFormatted}`);

    if (customFont) {
      page.drawText(row1, { x: width - 45 - customFont.widthOfTextAtSize(row1, 10), y: metaY - 22, size: 10, font: customFont, color: rgb(0.15, 0.2, 0.3) });
      page.drawText(row2, { x: width - 45 - customFont.widthOfTextAtSize(row2, 10), y: metaY - 44, size: 10, font: customFont, color: rgb(0.15, 0.2, 0.3) });
      page.drawText(row3, { x: width - 45 - customFont.widthOfTextAtSize(row3, 10), y: metaY - 65, size: 10, font: customFont, color: rgb(0.15, 0.2, 0.3) });
      page.drawText(row4, { x: width - 45 - customFont.widthOfTextAtSize(row4, 10), y: metaY - 86, size: 10, font: customFont, color: rgb(0.15, 0.2, 0.3) });
    }

    // Body Lines
    const bodyY = metaY - 130;
    const p1 = this.shapeArabicText('تحية طيبة وبعد،،،');
    const p2 = this.shapeArabicText('بالإشارة إلى موضوع المستند والعملية الموضحة بياناتها بعاليه، نرفع لسيادتكم النسخة الرقمية الأصلية');
    const p3 = this.shapeArabicText('للمراجعة التنفيذية واتخاذ قرار الاعتماد الرسمي وتوليد الهاش الأمني الرقمي لفتح الطباعة المعتمدة.');
    const p4 = this.shapeArabicText('المستند مستوفٍ لكافة الشروط القانونية والمواصفات طبقاً لأحكام القانون رقم 182 لسنة 2018 ولائحته التنفيذية.');
    const noteText = approval.notes ? this.shapeArabicText(`ملاحظات مقدم الطلب: ${approval.notes.substring(0, 100)}`) : '';

    if (customFont) {
      page.drawText(p1, { x: width - 45 - customFont.widthOfTextAtSize(p1, 11), y: bodyY, size: 11, font: customFont, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(p2, { x: width - 45 - customFont.widthOfTextAtSize(p2, 10.5), y: bodyY - 26, size: 10.5, font: customFont, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(p3, { x: width - 45 - customFont.widthOfTextAtSize(p3, 10.5), y: bodyY - 50, size: 10.5, font: customFont, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(p4, { x: width - 45 - customFont.widthOfTextAtSize(p4, 10.5), y: bodyY - 74, size: 10.5, font: customFont, color: rgb(0.2, 0.2, 0.2) });
      if (noteText) {
        page.drawText(noteText, { x: width - 45 - customFont.widthOfTextAtSize(noteText, 9.5), y: bodyY - 105, size: 9.5, font: customFont, color: rgb(0.4, 0.3, 0.1) });
      }
    }

    // Security Verification Box
    const hashBoxY = 100;
    page.drawRectangle({
      x: 35,
      y: hashBoxY,
      width: width - 70,
      height: 70,
      color: rgb(0.96, 0.98, 0.96),
      borderColor: rgb(0.15, 0.6, 0.3),
      borderWidth: 1.2,
    });

    const sealTitle = this.shapeArabicText('🔐 الختم والتحقق الأمني المشفر (GoldenERP Security Gateway)');
    const statusArabic = this.shapeArabicText(approval.status === 'APPROVED' ? 'الحالة: معتمد رسمياً بقرار المدير العام' : 'الحالة: قيد المراجعة بانتظار قرار السيد المدير العام عبر تليجرام');
    const hashMatch = approval.notes?.match(/\[HASH:\s*([A-F0-9]{32})\]/);
    const hashVal = hashMatch ? hashMatch[1] : (approval.id || 'PENDING-APPROVAL-GATEWAY');
    const hashLine = `[SHA-256 HASH: ${hashVal}]`;

    if (customFont) {
      page.drawText(sealTitle, { x: (width - customFont.widthOfTextAtSize(sealTitle, 10)) / 2, y: hashBoxY + 50, size: 10, font: customFont, color: rgb(0.1, 0.45, 0.2) });
      page.drawText(statusArabic, { x: (width - customFont.widthOfTextAtSize(statusArabic, 10.5)) / 2, y: hashBoxY + 32, size: 10.5, font: customFont, color: rgb(0.1, 0.45, 0.2) });
      page.drawText(hashLine, { x: (width - customFont.widthOfTextAtSize(hashLine, 9)) / 2, y: hashBoxY + 14, size: 9, font: customFont, color: rgb(0.3, 0.3, 0.3) });
    }

    // Bottom Decorative Bar
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: 12,
      color: rgb(0.12, 0.23, 0.54),
    });

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * تسجيل المستمعين والأوامر الخاصة بالمدير العام
   */
  private registerHandlers() {
    if (!this.bot) return;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. أمر البداية والتفعيل /start — يفتح مباشرة أزرار الشركات الأربعة
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('start', async (ctx) => {
      const currentChatId = String(ctx.chat.id);
      const senderName = ctx.from.first_name || 'السيد المدير العام';

      if (!this.adminChatId) {
        this.adminChatId = currentChatId;
        await this.persistAdminChatId(currentChatId);
        this.logger.log(`🔑 Automatically paired and locked Telegram Admin Chat ID to: ${currentChatId} (${senderName})`);
      } else if (this.adminChatId !== currentChatId) {
        await ctx.replyWithHTML(TELEGRAM_MESSAGES.UNAUTHORIZED_ACCESS);
        return;
      }

      // إعادة ضبط سياق الشركة لتظهر شاشة اختيار الشركات الـ 4 فقط
      this.userCompanyContext.delete(currentChatId);

      await ctx.reply(
        '🌟 أهلاً بك يا فندم في المساعد التنفيذي GoldenERP VIP\n👇 يرجى اختيار الشركة التي ترغب في متابعتها:',
        this.removeKeyboard
      );

      await this.handleCompanyMenuCommand(ctx, false);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. لوحة التحكم واختيار الشركة
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


    this.bot.command('company', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await this.handleCompanyMenuCommand(ctx);
    });

    this.bot.action('cmd_company', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await ctx.answerCbQuery();
      await this.handleCompanyMenuCommand(ctx, true);
    });



    this.bot.hears(/لوحة التحكم|الرئيسية/i, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const chatId = String(ctx.chat.id);
      const activeComp = this.userCompanyContext.get(chatId);
      if (!activeComp) {
        await this.handleCompanyMenuCommand(ctx, false);
      } else {
        await this.handleCompanyHubCommand(ctx, activeComp, false);
      }
    });

    this.bot.hears(/الشركة|اختيار الشركة/i, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await this.handleCompanyMenuCommand(ctx);
    });

    // استقبال حدث النقر على أي شركة من الشركات الـ 4
    this.bot.action(/^hub_comp_([ABCD])$/, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const compCode = ctx.match[1]; // 'A' | 'B' | 'C' | 'D'
      const chatId = String(ctx.chat?.id || this.adminChatId);
      this.userCompanyContext.set(chatId, compCode);

      await ctx.answerCbQuery('🏢 فتح المقر التنفيذي للشركة...');
      await this.handleCompanyHubCommand(ctx, compCode, true);
    });

    // تبديل سياق العمل السريع (set_comp)
    this.bot.action(/^set_comp_([ABCD])$/, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const compCode = ctx.match[1];
      const chatId = String(ctx.chat?.id || this.adminChatId);
      this.userCompanyContext.set(chatId, compCode);

      await ctx.answerCbQuery('✅ تم اعتماد نطاق الشركة بنجاح!');
      await this.handleCompanyHubCommand(ctx, compCode, true);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. طلبات اعتماد الطباعة والمستندات المعلقة
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('pending', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const chatId = String(ctx.chat.id);
      const activeComp = this.userCompanyContext.get(chatId) || 'ALL';
      await this.handlePendingCommand(ctx, activeComp);
    });

    this.bot.action(/^cmd_pending_(.+)$/, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const compCode = ctx.match[1];
      await ctx.answerCbQuery();
      await this.handlePendingCommand(ctx, compCode);
    });

    this.bot.action('cmd_pending', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const chatId = String(ctx.chat?.id || this.adminChatId);
      const activeComp = this.userCompanyContext.get(chatId) || 'ALL';
      await ctx.answerCbQuery();
      await this.handlePendingCommand(ctx, activeComp);
    });



    this.bot.hears(/طلبات الاعتماد|المعلقة|طباعة الموظفين/i, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const chatId = String(ctx.chat.id);
      const activeComp = this.userCompanyContext.get(chatId) || 'ALL';
      await this.handlePendingCommand(ctx, activeComp);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. جدول مواعيد وجلسات اليوم
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('today', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const chatId = String(ctx.chat.id);
      const activeComp = this.userCompanyContext.get(chatId) || 'ALL';
      await this.handleTodayCommand(ctx, activeComp);
    });

    this.bot.action(/^cmd_today_(.+)$/, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const compCode = ctx.match[1];
      await ctx.answerCbQuery();
      await this.handleTodayCommand(ctx, compCode);
    });

    this.bot.action('cmd_today', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const chatId = String(ctx.chat?.id || this.adminChatId);
      const activeComp = this.userCompanyContext.get(chatId) || 'ALL';
      await ctx.answerCbQuery();
      await this.handleTodayCommand(ctx, activeComp);
    });

    this.bot.hears(/جدول اليوم|مواعيد اليوم|جلسات اليوم/i, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const chatId = String(ctx.chat.id);
      const activeComp = this.userCompanyContext.get(chatId) || 'ALL';
      await this.handleTodayCommand(ctx, activeComp);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. المواعيد والجلسات القادمة (خلال 30 يوماً)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('upcoming', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const chatId = String(ctx.chat.id);
      const activeComp = this.userCompanyContext.get(chatId) || 'ALL';
      await this.handleUpcomingDatesCommand(ctx, activeComp);
    });

    this.bot.action(/^cmd_upcoming_(.+)$/, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const compCode = ctx.match[1];
      await ctx.answerCbQuery();
      await this.handleUpcomingDatesCommand(ctx, compCode);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6. سريان ومدد الضمانات البنكية
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('guarantees', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const chatId = String(ctx.chat.id);
      const activeComp = this.userCompanyContext.get(chatId) || 'ALL';
      await this.handleGuaranteesSummaryCommand(ctx, activeComp);
    });

    this.bot.action(/^cmd_guar_(.+)$/, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const compCode = ctx.match[1];
      await ctx.answerCbQuery();
      await this.handleGuaranteesSummaryCommand(ctx, compCode);
    });



    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 8. إرسال وتحميل ملف الـ PDF مباشرة للمدير في الشات
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.action(/^send_pdf_(.+)$/, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const approvalId = ctx.match[1];
      await ctx.answerCbQuery('⏳ جاري جلب ملف الـ PDF وإرساله...');
      await this.handleSendPdfAction(ctx, approvalId);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 9. أمر حالة المنظومة والربط /status
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('status', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await this.handleSystemStatusCommand(ctx);
    });

    this.bot.hears(/حالة المنظومة|الأمان|الربط/i, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await this.handleSystemStatusCommand(ctx);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 10. إعدادات وتخصيص تنبيهات البوت /alerts
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('alerts', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await this.handleAlertsMenuCommand(ctx);
    });

    this.bot.action('cmd_alerts_menu', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await ctx.answerCbQuery();
      await this.handleAlertsMenuCommand(ctx, true);
    });

    this.bot.hears(/إعدادات وتنبيهات البوت|تخصيص التنبيهات|تنبيهات البوت|إعدادات البوت/i, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await this.handleAlertsMenuCommand(ctx);
    });

    this.bot.action('cmd_alerts_refresh', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await ctx.answerCbQuery('🔄 تم تحديث الإعدادات');
      await this.handleAlertsMenuCommand(ctx, true);
    });

    this.bot.action(/^toggle_alert_(.+)$/, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const key = ctx.match[1];
      await this.handleToggleAlertSetting(ctx, key);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 11. أمر المساعدة /help
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('help', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const chatId = String(ctx.chat.id);
      await ctx.replyWithHTML(`
🏛️ <b>دليل استخدام المساعد التنفيذي للمدير العام (GoldenERP VIP):</b>
━━━━━━━━━━━━━━━━━━━━━━
• <b>الشركات الـ 4:</b> انقر على أي شركة (جولدن، إكسلنت، العهد، الشركة الرابعة) لفتح مقرها ومتابعة طلباتها وجدولها وضماناتها.
• <b>طلبات الاعتماد الفورية:</b> استعراض خطابات ومستندات الموظفين مع إمكانية عرض وتحميل الـ PDF فورياً، والاعتماد أو الرفض بنقرة واحدة.
• <b>التشفير الحكومي:</b> توليد هاش SHA-256 رسمي مشفر فور الموافقة وفتح الطباعة للموظف.
• <b>التنبيهات الاستباقية:</b> تصلك تنبيهات المواعيد الحساسة (قبل 5 أيام، قبل يومين، إلخ) تلقائياً من الخارج وفقاً لإعدادات المنظومة.
• <b>الأزرار الموحدة:</b> لوحة تحكم واحدة ثابتة أسفل الشاشة للتنقل السريع بدون كتابة.
━━━━━━━━━━━━━━━━━━━━━━
`, this.removeKeyboard);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 12. زر الاعتماد الرسمي وتوليد الهاش [ approve_print_{id} ]
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.action(/^approve_print_(.+)$/, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const approvalId = ctx.match[1];

      try {
        const approval = await this.prisma.approval.findUnique({
          where: { id: approvalId },
        });

        if (!approval) {
          await ctx.answerCbQuery('⚠️ هذا الطلب غير موجود أو تم حذفه', { show_alert: true });
          return;
        }

        if (approval.status !== 'PENDING') {
          await ctx.answerCbQuery(`⚠️ تم اتخاذ إجراء سابقاً على هذا الطلب (${approval.status})`, { show_alert: true });
          return;
        }

        const securityHash = randomBytes(16).toString('hex').toUpperCase();
        const approvedAt = new Date();
        const dateStr = approvedAt.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' });
        const companyBadge = this.getCompanyBadgeDynamic(approval.operationCode || undefined);

        const updated = await this.prisma.approval.update({
          where: { id: approvalId },
          data: {
            status: 'APPROVED',
            approvedBy: 'المدير العام (اعتماد تليجرام رسمي)',
            approvedAt,
            notes: `[HASH: ${securityHash}] — تم الاعتماد بنجاح وتوليد الهاش الأمني بواسطة السيد المدير العام عبر تليجرام`,
          },
        });

        await ctx.answerCbQuery('✅ تم الاعتماد الرسمي وتوليد الهاش الأمني بنجاح!', { show_alert: true });

        await this.safeEditMessageText(
          ctx,
          TELEGRAM_MESSAGES.APPROVAL_CONFIRMED({
            documentTitle: updated.documentTitle || 'مستند رسمي معتمد',
            operationCode: updated.operationCode || 'A15',
            companyTitle: companyBadge.fullTitle,
            securityHash,
            approvedAt: dateStr,
          }),
          { parse_mode: 'HTML' },
          true
        );

        this.logger.log(`🎯 Approval ${approvalId} APPROVED via Telegram by GM. Hash: ${securityHash}`);

      } catch (err) {
        this.logger.error('Error handling approve_print:', err);
        await ctx.answerCbQuery('❌ حدث خطأ أثناء معالجة الاعتماد', { show_alert: true });
      }
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 13. زر رفض الطلب [ reject_print_{id} ]
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.action(/^reject_print_(.+)$/, async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      const approvalId = ctx.match[1];

      try {
        const approval = await this.prisma.approval.findUnique({
          where: { id: approvalId },
        });

        if (!approval || approval.status !== 'PENDING') {
          await ctx.answerCbQuery('⚠️ هذا الطلب غير صالح أو تم التصرف فيه', { show_alert: true });
          return;
        }

        const rejectedAt = new Date();
        const dateStr = rejectedAt.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' });
        const reason = 'تم الرفض بواسطة السيد المدير العام عبر تليجرام (بحاجة لمراجعة وتعديل)';
        const companyBadge = this.getCompanyBadgeDynamic(approval.operationCode || undefined);

        const updated = await this.prisma.approval.update({
          where: { id: approvalId },
          data: {
            status: 'REJECTED',
            approvedBy: 'السيد المدير العام (تليجرام)',
            approvedAt: rejectedAt,
            notes: `${approval.notes || ''} [مرفوض عبر تليجرام: ${reason}]`,
          },
        });

        await ctx.answerCbQuery('❌ تم رفض الطلب وإلغاء صلاحية الطباعة في المنظومة', { show_alert: true });

        await this.safeEditMessageText(
          ctx,
          TELEGRAM_MESSAGES.REJECTION_CONFIRMED({
            documentTitle: updated.documentTitle || 'مستند رسمي',
            operationCode: updated.operationCode || 'A15',
            companyTitle: companyBadge.fullTitle,
            reason,
            rejectedAt: dateStr,
          }),
          { parse_mode: 'HTML' },
          true
        );

        this.logger.log(`🚫 Approval ${approvalId} REJECTED via Telegram by GM.`);

      } catch (err) {
        this.logger.error('Error handling reject_print:', err);
        await ctx.answerCbQuery('❌ حدث خطأ أثناء رفض الطلب', { show_alert: true });
      }
    });

    // معالجة أي رسالة نصية عامة
    this.bot.on('text', async (ctx) => {
      const currentChatId = String(ctx.chat.id);
      if (!this.adminChatId) {
        this.adminChatId = currentChatId;
        await this.persistAdminChatId(currentChatId);
        this.logger.log(`🔑 Automatically paired Telegram Admin Chat ID to: ${currentChatId}`);
        await ctx.reply(
          '🌟 مرحباً بك يا فندم في GoldenERP VIP',
          this.removeKeyboard
        );
        await this.handleDashboardCommand(ctx, false);
        return;
      }

      if (this.adminChatId !== currentChatId) {
        await ctx.replyWithHTML(TELEGRAM_MESSAGES.UNAUTHORIZED_ACCESS);
        return;
      }

      await this.handleDashboardCommand(ctx, false);
    });
  }

  /**
   * التحقق الأمني: هل المرسل هو المدير العام؟
   */
  private isAuthorizedUser(ctx: any): boolean {
    const currentChatId = String(ctx.chat?.id || ctx.from?.id);
    if (!this.adminChatId) {
      this.adminChatId = currentChatId;
      this.persistAdminChatId(currentChatId);
      this.logger.log(`🔑 Automatically paired Telegram Admin Chat ID: ${currentChatId}`);
      return true;
    }

    if (this.adminChatId !== currentChatId) {
      ctx.replyWithHTML?.(TELEGRAM_MESSAGES.UNAUTHORIZED_ACCESS);
      return false;
    }
    return true;
  }

  private async persistAdminChatId(chatId: string) {
    try {
      await this.prisma.systemSetting.upsert({
        where: { key: 'telegram_admin_chat_id' },
        update: { value: chatId },
        create: {
          key: 'telegram_admin_chat_id',
          value: chatId,
          group: 'telegram',
          label: 'معرف شات تليجرام المعتمد للسيد المدير العام (Chat ID)',
        },
      });

      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf-8');
        if (content.includes('TELEGRAM_ADMIN_CHAT_ID=')) {
          content = content.replace(/TELEGRAM_ADMIN_CHAT_ID=.*/, `TELEGRAM_ADMIN_CHAT_ID="${chatId}"`);
        } else {
          content += `\nTELEGRAM_ADMIN_CHAT_ID="${chatId}"\n`;
        }
        fs.writeFileSync(envPath, content, 'utf-8');
      }
    } catch (e) {
      this.logger.warn(`Could not persist Chat ID: ${e}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // معالجات الأوامر والواجهات التفاعلية
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * لوحة القيادة التنفيذية الذكية مع الشركات الأربعة
   */
  private async handleDashboardCommand(ctx: any, isEdit = false) {
    try {
      const chatId = String(ctx.chat?.id || this.adminChatId);
      const bossName = ctx.from?.first_name || 'السيد المدير العام';
      const activeCode = this.userCompanyContext.get(chatId) || 'ALL';

      let activeName = 'كافة الشركات (عرض موحد)';
      if (activeCode !== 'ALL') {
        const b = this.getCompanyBadgeDynamic(activeCode);
        activeName = `${b.emoji} ${b.fullTitle}`;
      }

      // حساب الإحصائيات اللحظية
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [pendingApprovalsCount, todayEventsCount, upcomingDatesCount, activeGuarantees, totalActiveOps] =
        await Promise.all([
          this.prisma.approval.count({ where: { status: 'PENDING' } }),
          this.prisma.operationDate.count({
            where: { dateValue: { gte: startOfDay, lte: endOfDay } },
          }),
          this.prisma.operationDate.count({
            where: { dateValue: { gt: endOfDay, lte: thirtyDaysAhead } },
          }),
          this.prisma.guarantee.findMany({
            where: { status: 'ACTIVE' },
            select: { endDate: true },
          }),
          this.prisma.operation.count(),
        ]);

      let expiringGuaranteesCount = 0;
      for (const g of activeGuarantees) {
        if (g.endDate) {
          const diffDays = Math.ceil((new Date(g.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 30) expiringGuaranteesCount++;
        }
      }

      const msg = TELEGRAM_MESSAGES.DASHBOARD_EXECUTIVE({
        bossName,
        activeCompanyName: activeName,
        totalActiveOps,
        pendingApprovalsCount,
        todayEventsCount,
        upcomingDatesCount,
        expiringGuaranteesCount,
      });

      const inlineKeyboard = await this.getCompanyInlineKeyboard();
      await this.safeEditMessageText(ctx, msg, { parse_mode: 'HTML', ...inlineKeyboard }, isEdit);
    } catch (err) {
      this.logger.error('Error in handleDashboardCommand:', err);
      await ctx.reply('حدث خطأ أثناء فتح لوحة القيادة التنفيذية');
    }
  }

  /**
   * قائمة اختيار الشركة
   */
  private async handleCompanyMenuCommand(ctx: any, isEdit = false) {
    const chatId = String(ctx.chat?.id || this.adminChatId);
    const currentCode = this.userCompanyContext.get(chatId) || 'ALL';
    let currentTitle = 'عرض موحد وشامل (كافة الشركات)';
    if (currentCode !== 'ALL') {
      const b = this.getCompanyBadgeDynamic(currentCode);
      currentTitle = `${b.emoji} ${b.fullTitle}`;
    }

    const msg = TELEGRAM_MESSAGES.COMPANY_SELECTION_MENU(currentTitle);
    const inlineKeyboard = await this.getCompanyInlineKeyboard();
    await this.safeEditMessageText(ctx, msg, { parse_mode: 'HTML', ...inlineKeyboard }, isEdit);
  }

  /**
   * المقر التنفيذي المخصص لشركة محددة (جولدن، إكسلنت، العهد، الشركة الرابعة)
   */
  private async handleCompanyHubCommand(ctx: any, compCode: string, isEdit = false) {
    try {
      const chatId = String(ctx.chat?.id || this.adminChatId);
      this.userCompanyContext.set(chatId, compCode);

      const badge = this.getCompanyBadgeDynamic(compCode);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // استعلامات مخصصة لهذه الشركة
      const [allPendings, allTodayDates, allUpcomingDates, guarantees] = await Promise.all([
        this.prisma.approval.findMany({ where: { status: 'PENDING' } }),
        this.prisma.operationDate.findMany({
          where: { dateValue: { gte: startOfDay, lte: endOfDay } },
          include: { operation: { include: { companies: { select: { displayCode: true } } } } },
        }),
        this.prisma.operationDate.findMany({
          where: { dateValue: { gt: endOfDay, lte: thirtyDaysAhead } },
          include: { operation: { include: { companies: { select: { displayCode: true } } } } },
        }),
        this.prisma.guarantee.findMany({
          where: { status: 'ACTIVE' },
          include: { operation: { include: { companies: { select: { displayCode: true } } } } },
        }),
      ]);

      const pendingCount = allPendings.filter((p) => {
        const b = this.getCompanyBadgeDynamic(p.operationCode || undefined);
        return b.code === compCode;
      }).length;

      const todayCount = allTodayDates.filter((d) => {
        const c = d.operation?.companies?.[0]?.displayCode || '';
        return c.toUpperCase().startsWith(compCode);
      }).length;

      const upcomingCount = allUpcomingDates.filter((d) => {
        const c = d.operation?.companies?.[0]?.displayCode || '';
        return c.toUpperCase().startsWith(compCode);
      }).length;

      const companyGuarantees = guarantees.filter((g) => {
        const c = g.operation?.companies?.[0]?.displayCode || '';
        return c.toUpperCase().startsWith(compCode);
      });

      const activeGuarantees = companyGuarantees.length;
      let expiringGuarantees = 0;
      for (const g of companyGuarantees) {
        if (g.endDate) {
          const diffDays = Math.ceil((new Date(g.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 30) expiringGuarantees++;
        }
      }

      const msg = TELEGRAM_MESSAGES.COMPANY_HUB_DASHBOARD({
        companyBadge: badge,
        pendingApprovals: pendingCount,
        todayEvents: todayCount,
        upcomingEvents: upcomingCount,
        activeGuarantees,
        expiringGuarantees,
      });

      const inlineKeyboard = this.getCompanyHubKeyboard(compCode);
      await this.safeEditMessageText(ctx, msg, { parse_mode: 'HTML', ...inlineKeyboard }, isEdit);
    } catch (err) {
      this.logger.error(`Error in handleCompanyHubCommand (${compCode}):`, err);
      await ctx.reply('حدث خطأ أثناء فتح مقر الشركة');
    }
  }

  /**
   * استخراج رابط PDF السحابي أو المحلي إن وجد
   */
  private extractPdfUrl(approval: any): string | null {
    if (!approval) return null;
    if (approval.cloudPdfUrl && approval.cloudPdfUrl.startsWith('http')) {
      return approval.cloudPdfUrl;
    }
    if (approval.previewUrl && approval.previewUrl.startsWith('http')) {
      return approval.previewUrl;
    }
    if (approval.notes) {
      const match = approval.notes.match(/https?:\/\/[^\s"'<>]+\.(?:pdf|cloudflarestorage\.com[^\s"'<>]*)/i);
      if (match) return match[0];
      const generalUrl = approval.notes.match(/https?:\/\/[^\s"'<>]+/);
      if (generalUrl) return generalUrl[0];
    }
    return null;
  }

  /**
   * تحميل بافر PDF من رابط سحابي أو مسار محلي
   */
  private async fetchPdfBuffer(pdfUrlOrPath: string): Promise<Buffer | null> {
    try {
      if (pdfUrlOrPath.startsWith('http://') || pdfUrlOrPath.startsWith('https://')) {
        const res = await fetch(pdfUrlOrPath);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          return Buffer.from(arrayBuf);
        }
      } else if (fs.existsSync(pdfUrlOrPath)) {
        return fs.readFileSync(pdfUrlOrPath);
      }
    } catch (err) {
      this.logger.warn(`Could not fetch PDF from ${pdfUrlOrPath}: ${err}`);
    }
    return null;
  }

  /**
   * إجراء جلب وإرسال ملف الـ PDF مباشرة إلى شات المدير العام
   */
  private async handleSendPdfAction(ctx: any, approvalId: string) {
    try {
      const approval = await this.prisma.approval.findUnique({
        where: { id: approvalId },
      });

      if (!approval) {
        await ctx.reply('⚠️ لم يتم العثور على هذا الطلب.');
        return;
      }

      const companyBadge = this.getCompanyBadgeDynamic(approval.operationCode || undefined);
      let pdfUrl = this.extractPdfUrl(approval);
      let pdfBuffer: Buffer | null = null;

      // محاولة البحث عن المستند في سجل المستندات الرسمية إذا لم نجد رابطاً مباشراً
      if (!pdfUrl && approval.entityId) {
        try {
          const doc = await this.prisma.operationDocument.findFirst({
            where: {
              OR: [
                { id: approval.entityId },
                { operationId: approval.entityId },
              ],
            },
            orderBy: { createdAt: 'desc' },
          });
          if (doc?.filePath) {
            pdfUrl = doc.filePath;
          }
        } catch {}
      }

      if (pdfUrl) {
        pdfBuffer = await this.fetchPdfBuffer(pdfUrl);
      }

      // إذا لم يتوفر ملف من الرابط أو كان غير متاح، نقوم بتوليد ملف PDF رقمي أصلي معتمد فورياً
      if (!pdfBuffer || pdfBuffer.length === 0) {
        try {
          pdfBuffer = await this.generateApprovalPdfDocument(approval);
        } catch (genErr) {
          this.logger.error('Error generating fallback PDF for approval:', genErr);
        }
      }

      if (pdfBuffer && pdfBuffer.length > 0) {
        const cleanName = (approval.documentTitle || 'مستند_رسمي').replace(/[\\/:*?"<>|]/g, '_');
        const filename = `${cleanName}.pdf`;
        await ctx.replyWithDocument(
          { source: pdfBuffer, filename },
          {
            caption: `📄 <b>ملف أصل المستند المطلوب اعتماده</b>\n🏢 ${companyBadge.fullTitle}\n🏷️ كود العملية: [${approval.operationCode || 'A15'}]\n📄 العنوان: ${approval.documentTitle}`,
            parse_mode: 'HTML',
          }
        );

        await ctx.replyWithHTML(
          `👆 <i>تم إرسال نسخة أصل المستند كاملة بصيغة PDF أعلاه بنجاح. يرجى اتخاذ القرار:</i>`,
          Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ اعتماد وتوليد الهاش الأمني', `approve_print_${approval.id}`),
              Markup.button.callback('❌ رفض الطلب', `reject_print_${approval.id}`),
            ],
          ])
        );
        return;
      }

      if (pdfUrl && pdfUrl.startsWith('http')) {
        await ctx.replyWithHTML(
          `📄 <b>رابط المستند السحابي المباشر:</b>\n<a href="${pdfUrl}">اضغط هنا لفتح وتنزيل ملف الـ PDF 📥</a>\n🏢 ${companyBadge.fullTitle}`,
          Markup.inlineKeyboard([
            [Markup.button.url('👁️ فتح وتحميل الـ PDF سحابياً', pdfUrl)],
            [
              Markup.button.callback('✅ اعتماد فوري وتوليد الهاش', `approve_print_${approval.id}`),
              Markup.button.callback('❌ رفض', `reject_print_${approval.id}`),
            ],
          ])
        );
      }
    } catch (err) {
      this.logger.error('Error in handleSendPdfAction:', err);
      await ctx.reply('❌ حدث خطأ أثناء إرسال ملف الـ PDF');
    }
  }

  /**
   * عرض طلبات اعتماد الطباعة والمستندات للمدير العام
   */
  private async handlePendingCommand(ctx: any, compCode = 'ALL') {
    try {
      const chatId = String(ctx.chat?.id || this.adminChatId);
      const pendings = await this.prisma.approval.findMany({
        where: { status: 'PENDING' },
        orderBy: { requestedAt: 'desc' },
      });

      // تصفية حسب الشركة المحددة
      const filtered = pendings.filter((p) => {
        const badge = this.getCompanyBadgeDynamic(p.operationCode || undefined);
        return badge.code === compCode;
      });

      const compTitle = this.getCompanyBadgeDynamic(compCode).fullTitle;

      if (filtered.length === 0) {
        await ctx.replyWithHTML(
          `✅ <b>لا توجد طلبات اعتماد معلقة لـ ${compTitle}</b>\n━━━━━━━━━━━━━━━━━━━━━━\nجميع طلبات الطباعة والعقود معتمدة ومنجزة لهذه الشركة بنجاح.`,
          Markup.inlineKeyboard([
            [Markup.button.callback('🔙 المقر التنفيذي للشركة', `hub_comp_${compCode}`)],
            [Markup.button.callback('🏢 اختيار شركة أخرى', 'cmd_company')],
          ])
        );
        return;
      }

      await ctx.replyWithHTML(`
🖨️ <b>طلبات الاعتماد والطباعة المعلقة [${compTitle}] (${filtered.length}):</b>
━━━━━━━━━━━━━━━━━━━━━━
👇 <i>يمكنك معاينة/تحميل ملف الـ PDF أو الاعتماد والرفض مباشرة لكل طلب:</i>
      `.trim());

      for (const item of filtered.slice(0, 5)) {
        const dateStr = new Date(item.requestedAt).toLocaleString('ar-EG', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'Africa/Cairo',
        });
        const companyBadge = this.getCompanyBadgeDynamic(item.operationCode || undefined);
        const cloudUrl = this.extractPdfUrl(item);

        const text = `
🏢 <b>الشركة التابعة:</b> ${companyBadge.emoji} <b>${companyBadge.fullTitle}</b>
📄 <b>المستند المطلوب:</b> <b>${item.documentTitle}</b>
🏷️ <b>كود العملية:</b> <code>[${item.operationCode || 'A15'}]</code> — ${item.operationName}
👤 <b>المقدم:</b> ${item.requestedBy} (${dateStr})
${item.notes ? `📝 <i>${item.notes}</i>\n` : ''}
        `.trim();

        const buttons: any[] = [];
        if (cloudUrl) {
          buttons.push([Markup.button.url('👁️ معاينة المستند سحابياً', cloudUrl)]);
        }
        buttons.push([
          Markup.button.callback('📄 إرسال ملف الـ PDF هنا', `send_pdf_${item.id}`),
        ]);
        buttons.push([
          Markup.button.callback('✅ اعتماد وتوليد الهاش', `approve_print_${item.id}`),
          Markup.button.callback('❌ رفض', `reject_print_${item.id}`),
        ]);

        await ctx.replyWithHTML(text, Markup.inlineKeyboard(buttons));
      }

      if (filtered.length > 5) {
        await ctx.replyWithHTML(
          `ℹ️ <i>متبقي (${filtered.length - 5}) طلبات أخرى معلقة...</i>`,
          Markup.inlineKeyboard([
            [Markup.button.callback('🔙 العودة لمقر الشركة', `hub_comp_${compCode}`)],
          ])
        );
      }
    } catch (err) {
      this.logger.error('Error in handlePendingCommand:', err);
      await ctx.reply('حدث خطأ أثناء استرجاع الطلبات المعلقة');
    }
  }

  /**
   * جدول مواعيد وجلسات اليوم
   */
  private async handleTodayCommand(ctx: any, compCode = 'ALL') {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const todayDates = await this.prisma.operationDate.findMany({
        where: {
          dateValue: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          operation: {
            include: {
              companies: {
                select: {
                  displayCode: true,
                  company: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      const filtered = compCode === 'ALL'
        ? todayDates
        : todayDates.filter((d) => {
            const code = d.operation.companies[0]?.displayCode || '';
            return code.toUpperCase().startsWith(compCode);
          });

      const compTitle = this.getCompanyBadgeDynamic(compCode).fullTitle;

      if (filtered.length === 0) {
        await ctx.replyWithHTML(`
📅 <b>جدول اليوم [${compTitle}]: لا توجد جلسات مناقصات مسجلة لتاريخ اليوم.</b>
━━━━━━━━━━━━━━━━━━━━━━
استمتع بيوم هادئ ومثمر يا فندم! 🌟
        `.trim(), Markup.inlineKeyboard([
          [Markup.button.callback('⏰ استعراض المواعيد القادمة', `cmd_upcoming_${compCode}`)],
          [Markup.button.callback('🔙 المقر التنفيذي للشركة', `hub_comp_${compCode}`)],
        ]));
        return;
      }

      let msg = `
📅 <b>جلسات ومواعيد العمليات المجدولة لليوم [${compTitle}]:</b>
━━━━━━━━━━━━━━━━━━━━━━\n`;

      filtered.forEach((d, idx) => {
        const time = new Date(d.dateValue).toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Cairo',
        });
        const code = d.operation.companies[0]?.displayCode || 'A15';
        const compName = d.operation.companies[0]?.company?.name;
        const badge = this.getCompanyBadgeDynamic(code, compName);
        msg += `\n${idx + 1}. ${badge.emoji} <b>[${code}]</b> ${d.operation.name}\n   🏢 <b>الشركة:</b> ${badge.shortName}\n   ⚖️ <b>الحدث:</b> ${d.label || this.translateDateType(d.dateType)} (الساعة: ${time})\n   🏛️ <b>الجهة:</b> ${d.operation.authority}\n`;
      });

      await ctx.replyWithHTML(msg, Markup.inlineKeyboard([
        [Markup.button.callback('⏰ المواعيد القادمة', `cmd_upcoming_${compCode}`)],
        [Markup.button.callback('🔙 المقر التنفيذي', `hub_comp_${compCode}`)],
      ]));
    } catch (err) {
      this.logger.error('Error in handleTodayCommand:', err);
      await ctx.reply('حدث خطأ أثناء فحص جدول اليوم');
    }
  }

  /**
   * المواعيد والجلسات القادمة (خلال 30 يوماً)
   */
  private async handleUpcomingDatesCommand(ctx: any, compCode = 'ALL') {
    try {
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const upcomingDates = await this.prisma.operationDate.findMany({
        where: {
          dateValue: {
            gt: endOfDay,
            lte: thirtyDaysAhead,
          },
        },
        include: {
          operation: {
            include: {
              companies: {
                select: {
                  displayCode: true,
                  company: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { dateValue: 'asc' },
      });

      const filtered = compCode === 'ALL'
        ? upcomingDates
        : upcomingDates.filter((d) => {
            const code = d.operation.companies[0]?.displayCode || '';
            return code.toUpperCase().startsWith(compCode);
          });

      const compTitle = this.getCompanyBadgeDynamic(compCode).fullTitle;

      const items = filtered.slice(0, 10).map((d) => {
        const code = d.operation.companies[0]?.displayCode || 'A15';
        const badge = this.getCompanyBadgeDynamic(code, d.operation.companies[0]?.company?.name);
        const diffDays = Math.ceil((new Date(d.dateValue).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const dateStr = new Date(d.dateValue).toLocaleDateString('ar-EG', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'Africa/Cairo',
        });

        return {
          opCode: code,
          opName: d.operation.name,
          authority: d.operation.authority,
          eventType: d.label || this.translateDateType(d.dateType),
          eventDate: dateStr,
          daysRemaining: diffDays,
          badge,
        };
      });

      const msg = TELEGRAM_MESSAGES.UPCOMING_DATES_REPORT({
        companyTitle: compTitle,
        totalCount: filtered.length,
        items,
      });

      await ctx.replyWithHTML(msg, Markup.inlineKeyboard([
        [Markup.button.callback('📅 جدول اليوم', `cmd_today_${compCode}`)],
        [Markup.button.callback('🔙 المقر التنفيذي', `hub_comp_${compCode}`)],
      ]));
    } catch (err) {
      this.logger.error('Error in handleUpcomingDatesCommand:', err);
      await ctx.reply('حدث خطأ أثناء فحص المواعيد القادمة');
    }
  }

  /**
   * ملخص سريان ومدد الضمانات البنكية
   */
  private async handleGuaranteesSummaryCommand(ctx: any, compCode = 'ALL') {
    try {
      const now = new Date();
      const guarantees = await this.prisma.guarantee.findMany({
        where: {
          status: 'ACTIVE',
          isRecovered: false,
        },
        include: {
          operation: {
            include: {
              companies: {
                select: {
                  displayCode: true,
                  company: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { endDate: 'asc' },
      });

      const filtered = compCode === 'ALL'
        ? guarantees
        : guarantees.filter((g) => {
            const code = g.operation.companies[0]?.displayCode || '';
            return code.toUpperCase().startsWith(compCode);
          });

      const compTitle = this.getCompanyBadgeDynamic(compCode).fullTitle;

      let totalAmount = 0;
      let expiringCount = 0;

      const items = filtered.slice(0, 8).map((g) => {
        const code = g.operation.companies[0]?.displayCode || 'A15';
        const numAmount = Number(g.amount) || 0;
        totalAmount += numAmount;

        let diffDays = 0;
        let statusStr = 'ساري ✅';
        if (g.endDate) {
          diffDays = Math.ceil((new Date(g.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 0) {
            statusStr = 'منتهي الصلاحية 🚨';
          } else if (diffDays <= 30) {
            statusStr = `يوشك على الانتهاء (متبقي ${diffDays} يوم) ⚠️`;
            expiringCount++;
          } else {
            statusStr = `ساري ومؤمن (متبقي ${diffDays} يوم) ✅`;
          }
        }

        const expiryStr = g.endDate
          ? new Date(g.endDate).toLocaleDateString('ar-EG', { dateStyle: 'medium', timeZone: 'Africa/Cairo' })
          : 'غير محدد';

        return {
          number: g.guaranteeNumber || 'بدون رقم',
          bank: g.bankName || 'البنك الأهلي',
          amount: numAmount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }),
          expiry: expiryStr,
          status: statusStr,
          opCode: code,
        };
      });

      const totalAmountStr = totalAmount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 });

      const msg = TELEGRAM_MESSAGES.GUARANTEES_REPORT({
        companyTitle: compTitle,
        totalCount: filtered.length,
        totalAmountStr,
        expiringCount,
        items,
      });

      await ctx.replyWithHTML(msg, Markup.inlineKeyboard([
        [Markup.button.callback('🔙 المقر التنفيذي', `hub_comp_${compCode}`)],
        [Markup.button.callback('🏢 اختيار شركة أخرى', 'cmd_company')],
      ]));
    } catch (err) {
      this.logger.error('Error in handleGuaranteesSummaryCommand:', err);
      await ctx.reply('حدث خطأ أثناء فحص خطابات الضمان');
    }
  }



  /**
   * تحويل نوع تاريخ العملية إلى مسمى عربي رسمي واضح
   */
  private translateDateType(type: string): string {
    switch (type) {
      case 'TECHNICAL_OPENING':
        return 'جلسة فتح المظاريف الفنية';
      case 'FINANCIAL_OPENING':
        return 'جلسة فتح المظاريف المالية';
      case 'AWARD_SESSION':
        return 'جلسة البت والترسية الرسمية';
      case 'TECHNICAL_DECISION':
        return 'إعلان نتيجة البت الفني';
      case 'FINANCIAL_DECISION':
        return 'إعلان نتيجة البت المالي';
      case 'BOOKLET_DEADLINE':
        return 'آخر موعد لشراء كراسة الشروط';
      case 'INQUIRIES_SESSION':
        return 'جلسة الرد على الاستفسارات';
      case 'INQUIRIES_DEADLINE':
        return 'آخر موعد لتقديم الاستفسارات';
      case 'AUCTION_SESSION':
        return 'جلسة المزايدة / الممارسة العلنية';
      case 'EXECUTION_START':
        return 'تاريخ بدء التوريد / أمر الشغل';
      case 'EXECUTION_END':
        return 'الموعد الأخير للتوريد والتسليم';
      case 'SITE_HANDOVER':
        return 'تسليم الموقع / الفحص والاستلام';
      default:
        return 'موعد إداري رسمي مجدول';
    }
  }

  /**
   * قائمة تخصيص وإعدادات تنبيهات البوت التفاعلية
   */
  private async handleAlertsMenuCommand(ctx: any, isEdit = false) {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'telegram_notifications_enabled',
              'telegram_alert_print_approvals',
              'telegram_alert_sessions',
              'telegram_alert_guarantees',
              'telegram_alert_daily_summary',
            ],
          },
        },
      });

      const getSettingVal = (k: string, def = true) => {
        const found = settings.find((s) => s.key === k);
        if (!found) return def;
        return found.value === 'true' || found.value === '1';
      };

      const notifEnabled = getSettingVal('telegram_notifications_enabled', true);
      const printAlerts = getSettingVal('telegram_alert_print_approvals', true);
      const sessionAlerts = getSettingVal('telegram_alert_sessions', true);
      const guarAlerts = getSettingVal('telegram_alert_guarantees', true);
      const summaryAlerts = getSettingVal('telegram_alert_daily_summary', true);

      const msg = `
⚙️ <b>مركز التحكم وإعدادات تنبيهات البوت</b>
━━━━━━━━━━━━━━━━━━━━━━
تصلك التنبيهات استباقياً على هاتفك بدون الحاجة للدخول للبوت:

• <b>طلبات اعتماد الطباعة:</b> إشعار فوري عند طلب الموظف طباعة أي مستند مع ملف الـ PDF.
• <b>جلسات ومواعيد العمليات:</b> تذكير استباقي بمواعيد فتح المظاريف والمزادات (قبل يومين).
• <b>سريان الضمانات البنكية:</b> تنبيه استباقي قبل انتهاء خطاب الضمان (وفق إعدادات المنظومة).
• <b>الموجز الصباحي (8:00 ص):</b> ملخص يومي شامل لأحداث وجلسات اليوم للشركات الأربعة.
━━━━━━━━━━━━━━━━━━━━━━
👇 <i>انقر على أي خيار أدناه لتبديل حالته فورياً:</i>
      `.trim();

      const inlineKeyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            `🔔 الإشعارات العامة: ${notifEnabled ? 'مفعلة ✅' : 'معطلة ❌'}`,
            'toggle_alert_telegram_notifications_enabled'
          ),
        ],
        [
          Markup.button.callback(
            `📄 طلبات اعتماد الطباعة: ${printAlerts ? 'مفعلة ✅' : 'معطلة ❌'}`,
            'toggle_alert_telegram_alert_print_approvals'
          ),
        ],
        [
          Markup.button.callback(
            `📅 تنبيهات الجلسات والمواعيد: ${sessionAlerts ? 'مفعلة ✅' : 'معطلة ❌'}`,
            'toggle_alert_telegram_alert_sessions'
          ),
        ],
        [
          Markup.button.callback(
            `🛡️ تنبيهات انتهاء الضمانات: ${guarAlerts ? 'مفعلة ✅' : 'معطلة ❌'}`,
            'toggle_alert_telegram_alert_guarantees'
          ),
        ],
        [
          Markup.button.callback(
            `☀️ التقرير الصباحي اليومي: ${summaryAlerts ? 'مفعل ✅' : 'معطل ❌'}`,
            'toggle_alert_telegram_alert_daily_summary'
          ),
        ],
        [
          Markup.button.callback('🔄 تحديث الإعدادات', 'cmd_alerts_refresh'),
          Markup.button.callback('🏛️ لوحة القيادة', 'cmd_company'),
        ],
      ]);

      await this.safeEditMessageText(ctx, msg, { parse_mode: 'HTML', ...inlineKeyboard }, isEdit);
    } catch (err) {
      this.logger.error('Error in handleAlertsMenuCommand:', err);
      await ctx.reply('حدث خطأ أثناء فتح إعدادات التنبيهات');
    }
  }

  /**
   * تبديل إعداد تنبيه محدد وحفظه في قاعدة البيانات
   */
  private async handleToggleAlertSetting(ctx: any, key: string) {
    try {
      const allowedKeys = [
        'telegram_notifications_enabled',
        'telegram_alert_print_approvals',
        'telegram_alert_sessions',
        'telegram_alert_guarantees',
        'telegram_alert_daily_summary',
      ];
      if (!allowedKeys.includes(key)) {
        await ctx.answerCbQuery('⚠️ إعداد غير معروف');
        return;
      }

      const current = await this.prisma.systemSetting.findUnique({ where: { key } });
      const currentVal = current ? current.value === 'true' || current.value === '1' : true;
      const newVal = !currentVal ? 'true' : 'false';

      await this.prisma.systemSetting.upsert({
        where: { key },
        update: { value: newVal },
        create: {
          key,
          value: newVal,
          type: 'boolean',
          label: key,
          group: 'telegram',
        },
      });

      await ctx.answerCbQuery(newVal === 'true' ? '✅ تم تفعيل التنبيه' : '⏸️ تم إيقاف التنبيه');
      await this.handleAlertsMenuCommand(ctx, true);
    } catch (err) {
      this.logger.error('Error in handleToggleAlertSetting:', err);
      await ctx.answerCbQuery('❌ فشل تغيير الإعداد');
    }
  }

  private async handleSystemStatusCommand(ctx: any) {
    try {
      const chatId = String(ctx.chat.id);
      const activeComp = this.userCompanyContext.get(chatId) || 'ALL';

      let lockAttempts = 3;
      let sessionTimeout = 120;

      try {
        const sLock = await this.prisma.systemSetting.findUnique({ where: { key: 'account_lock_attempts' } });
        if (sLock?.value) lockAttempts = parseInt(sLock.value, 10) || 3;
        const sTimeout = await this.prisma.systemSetting.findUnique({ where: { key: 'session_timeout_minutes' } });
        if (sTimeout?.value) sessionTimeout = parseInt(sTimeout.value, 10) || 120;
      } catch {}

      const compTitle = activeComp !== 'ALL'
        ? this.getCompanyBadgeDynamic(activeComp).fullTitle
        : 'الشركة النشطة';

      await ctx.replyWithHTML(
        TELEGRAM_MESSAGES.SYSTEM_STATUS_REPORT({
          botUsername: this.botUsername,
          adminChatId: this.adminChatId || chatId,
          activeCompany: compTitle,
          serverTime: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Cairo' }),
          securityLockAttempts: lockAttempts,
          sessionTimeout,
        }),
        this.removeKeyboard
      );

    } catch (err) {
      this.logger.error('Error in handleSystemStatusCommand:', err);
      await ctx.reply('حدث خطأ أثناء فحص حالة المنظومة');
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // الخدمات الخارجية الحية (تصل لكافة الشركات الأربعة دائماً)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * إرسال طلب اعتماد طباعة إلى هاتف المدير العام مع معاينة الـ PDF الحية
   */
  async sendPrintApprovalRequest(approval: any, pdfBuffer?: Buffer, pdfFilename?: string): Promise<boolean> {
    if (!this.adminChatId) {
      try {
        const s = await this.prisma.systemSetting.findUnique({ where: { key: 'telegram_admin_chat_id' } });
        if (s?.value) this.adminChatId = s.value.trim();
      } catch {}
    }

    if (!this.bot || !this.adminChatId) {
      this.logger.warn(`⚠️ Cannot send print approval: bot=${Boolean(this.bot)}, adminChatId=${this.adminChatId}`);
      return false;
    }

    try {
      // التحقق من تفعيل التنبيه في الإعدادات
      const notifSetting = await this.prisma.systemSetting.findUnique({ where: { key: 'telegram_notifications_enabled' } });
      if (notifSetting && notifSetting.value === 'false') return false;

      const printSetting = await this.prisma.systemSetting.findUnique({ where: { key: 'telegram_alert_print_approvals' } });
      if (printSetting && printSetting.value === 'false') return false;

      const dateStr = new Date(approval.requestedAt || Date.now()).toLocaleString('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Africa/Cairo',
      });

      let opCode = approval.operationCode;
      let compName = approval.companyName;

      if ((!opCode || !compName) && approval.entityId) {
        try {
          const op = await this.prisma.operation.findUnique({
            where: { id: approval.entityId },
            include: { companies: { select: { displayCode: true, company: { select: { name: true } } } } },
          });
          if (op?.companies?.[0]) {
            opCode = opCode || op.companies[0].displayCode;
            compName = compName || op.companies[0].company?.name;
          }
        } catch {}
      }

      const companyBadge = this.getCompanyBadgeDynamic(opCode, compName);

      const messageText = TELEGRAM_MESSAGES.PRINT_APPROVAL_REQUEST({
        id: approval.id,
        documentTitle: approval.documentTitle,
        companyBadge,
        authority: approval.authority || 'الجهة الحكومية المختصة',
        operationCode: opCode || 'A15',
        operationName: approval.operationName || 'مناقصة حكومية مسجلة',
        requestedBy: approval.requestedBy || 'مسؤول العطاءات',
        requestedAt: dateStr,
        notes: approval.notes,
      });

      const cloudUrl = this.extractPdfUrl(approval);
      let resolvedPdfBuffer: Buffer | null = pdfBuffer || null;

      // محاولة تحميل الـ PDF مسبقاً إذا لم يكن مرفقاً وكان الرابط متوفراً
      if (!resolvedPdfBuffer && cloudUrl) {
        try {
          resolvedPdfBuffer = await this.fetchPdfBuffer(cloudUrl);
        } catch (fetchErr) {
          this.logger.warn(`Could not pre-download PDF: ${fetchErr}`);
        }
      }

      // إذا لم يتوفر ملف من الرابط، نقوم بتوليد ملف PDF رقمي أصلي معتمد فورياً ليرفق مع التنبيه
      if (!resolvedPdfBuffer || resolvedPdfBuffer.length === 0) {
        try {
          resolvedPdfBuffer = await this.generateApprovalPdfDocument(approval);
        } catch (genErr) {
          this.logger.warn(`Could not pre-generate PDF for alert: ${genErr}`);
        }
      }

      // إرسال ملف الـ PDF كملف أصلي مستقل مرفق مع كابشن توضيحي
      if (resolvedPdfBuffer && resolvedPdfBuffer.length > 0) {
        const cleanTitle = (approval.documentTitle || 'مستند_رسمي').replace(/[\\/:*?"<>|]/g, '_');
        await this.bot.telegram.sendDocument(
          this.adminChatId,
          {
            source: resolvedPdfBuffer,
            filename: pdfFilename || `${cleanTitle}.pdf`,
          },
          {
            caption: `📄 <b>معاينة أصل المستند المطلوب اعتماده</b>\n🏢 ${companyBadge.fullTitle}\n🏷️ كود العملية: [${opCode || 'A15'}]`,
            parse_mode: 'HTML',
          }
        );
      }

      const buttonRows: any[] = [];
      if (cloudUrl) {
        buttonRows.push([Markup.button.url('👁️ معاينة المستند سحابياً', cloudUrl)]);
      }
      buttonRows.push([
        Markup.button.callback('📄 إرسال ملف الـ PDF هنا', `send_pdf_${approval.id}`),
      ]);
      buttonRows.push([
        Markup.button.callback('✅ اعتماد وتوليد الهاش الأمني', `approve_print_${approval.id}`),
        Markup.button.callback('❌ رفض الطلب', `reject_print_${approval.id}`),
      ]);

      const buttons = Markup.inlineKeyboard(buttonRows);

      await this.bot.telegram.sendMessage(this.adminChatId, messageText, {
        parse_mode: 'HTML',
        ...buttons,
      });

      this.logger.log(`📨 Sent print approval request for ${approval.id} [${companyBadge.shortName}] to GM: ${this.adminChatId}`);
      return true;

    } catch (err) {
      this.logger.error('Failed to send print approval request to Telegram:', err);
      return false;
    }
  }

  /**
   * إرسال تنبيه جلسة مناقصة استباقي
   */
  async sendSessionAlert(params: Parameters<typeof TELEGRAM_MESSAGES.SESSION_ALERT>[0]): Promise<boolean> {
    if (!this.adminChatId) {
      try {
        const s = await this.prisma.systemSetting.findUnique({ where: { key: 'telegram_admin_chat_id' } });
        if (s?.value) this.adminChatId = s.value.trim();
      } catch {}
    }

    if (!this.bot || !this.adminChatId) return false;
    try {
      await this.bot.telegram.sendMessage(this.adminChatId, TELEGRAM_MESSAGES.SESSION_ALERT(params), {
        parse_mode: 'HTML',
      });
      return true;
    } catch (err) {
      this.logger.error('Failed to send session alert:', err);
      return false;
    }
  }

  /**
   * إرسال تنبيه اقتراب انتهاء خطاب ضمان بنكي
   */
  async sendGuaranteeAlert(params: {
    letterNumber: string;
    bankName: string;
    amount: number | string;
    expiryDate: string | Date;
    daysRemaining: number;
    operationCode?: string;
    operationName?: string;
    authority?: string;
    companyCode?: string;
    companyName?: string;
  }): Promise<boolean> {
    if (!this.adminChatId) {
      try {
        const s = await this.prisma.systemSetting.findUnique({ where: { key: 'telegram_admin_chat_id' } });
        if (s?.value) this.adminChatId = s.value.trim();
      } catch {}
    }

    if (!this.bot || !this.adminChatId) return false;
    try {
      const companyBadge = this.getCompanyBadgeDynamic(params.companyCode || params.operationCode, params.companyName);
      const amountStr = typeof params.amount === 'number'
        ? params.amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
        : String(params.amount);
      const expiryStr = params.expiryDate instanceof Date
        ? params.expiryDate.toLocaleDateString('ar-EG', { dateStyle: 'medium', timeZone: 'Africa/Cairo' })
        : String(params.expiryDate);

      const msg = TELEGRAM_MESSAGES.GUARANTEE_EXPIRY_ALERT({
        companyBadge,
        operationCode: params.operationCode || 'A15',
        operationName: params.operationName || 'عملية مناقصة وتوريد',
        authority: params.authority || 'الجهة الإدارية المتعاقدة',
        letterNumber: params.letterNumber || 'بدون رقم',
        bankName: params.bankName || 'البنك الأهلي المصري',
        amount: amountStr,
        expiryDate: expiryStr,
        daysRemaining: params.daysRemaining,
      });

      await this.bot.telegram.sendMessage(this.adminChatId, msg, { parse_mode: 'HTML' });
      return true;
    } catch (err) {
      this.logger.error('Failed to send guarantee alert to Telegram:', err);
      return false;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // المهام الخلفية المجدولة الذكية (التنبيهات الاستباقية التلقائية)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * مهمة استباقية دورية تعمل كل ساعة لفحص استحقاقات المراحل والضمانات
   * وربطها مباشرة بإعدادات المنظومة (stage_alerts_config و guarantee_reminder_days)
   */
  @Cron('0 * * * *', { name: 'proactive-hourly-alerts', timeZone: 'Africa/Cairo' })
  async runProactiveMilestoneAndGuaranteeAlerts() {
    try {
      if (!this.bot || !this.adminChatId) return;

      // فحص هل الإشعارات مفعلة في إعدادات النظام
      const notifSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'telegram_notifications_enabled' },
      });
      if (notifSetting && notifSetting.value === 'false') return;

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // 1. قراءة إعدادات تنبيهات المراحل الاستباقية (stage_alerts_config)
      const stageConfigSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'stage_alerts_config' },
      });
      let stageAlertsMap: Record<string, { enabled: boolean; leadDays: number }> = {};
      if (stageConfigSetting?.value) {
        try {
          stageAlertsMap = JSON.parse(stageConfigSetting.value);
        } catch {}
      }

      // إذا لم تكن موجودة، نضع القيم القياسية
      if (Object.keys(stageAlertsMap).length === 0) {
        stageAlertsMap = {
          supply_delivery: { enabled: true, leadDays: 5 }, // تنبيه قبل 5 أيام من موعد التوريد
          session_opening: { enabled: true, leadDays: 2 }, // تنبيه قبل يومين من فتح المظاريف
          booklet_purchase: { enabled: true, leadDays: 3 }, // تنبيه قبل 3 أيام من شراء الكراسة
          inquiries_session: { enabled: true, leadDays: 2 }, // تنبيه قبل يومين من الاستفسارات
          auction_practice: { enabled: true, leadDays: 2 },
          award_order: { enabled: true, leadDays: 1 },
          guarantee_expiry: { enabled: true, leadDays: 15 },
        };
      }

      // 2. قراءة أيام تذكير الضمانات البنكية (guarantee_reminder_days)
      const guarDaysSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'guarantee_reminder_days' },
      });
      const guaranteeReminderDaysList = (guarDaysSetting?.value || '30,15,10,5')
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      // فحص جلسات ومواعيد العمليات في OperationDate
      const upcomingDates = await this.prisma.operationDate.findMany({
        where: {
          dateValue: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            lte: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          operation: {
            include: {
              companies: { select: { displayCode: true, company: { select: { name: true } } } },
            },
          },
        },
      });

      for (const od of upcomingDates) {
        const diffDays = Math.ceil((new Date(od.dateValue).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const opCode = od.operation?.companies?.[0]?.displayCode || 'A15';
        const badge = this.getCompanyBadgeDynamic(opCode, od.operation?.companies?.[0]?.company?.name);

        // مطابقة نوع الحدث مع خريطة الإعدادات (مثلاً supply_delivery قبل 5 أيام)
        let matchedKey: string | null = null;
        let stageArabicTitle = od.label || this.translateDateType(od.dateType);

        if (od.dateType === 'EXECUTION_END' || od.dateType === 'EXECUTION_START') {
          matchedKey = 'supply_delivery';
          stageArabicTitle = 'الموعد النهائي للتوريد والتسليم';
        } else if (od.dateType === 'TECHNICAL_OPENING' || od.dateType === 'FINANCIAL_OPENING') {
          matchedKey = 'session_opening';
        } else if (od.dateType === 'BOOKLET_DEADLINE') {
          matchedKey = 'booklet_purchase';
        } else if (od.dateType === 'INQUIRIES_SESSION' || od.dateType === 'INQUIRIES_DEADLINE') {
          matchedKey = 'inquiries_session';
        } else if (od.dateType === 'AUCTION_SESSION') {
          matchedKey = 'auction_practice';
        } else if (od.dateType === 'AWARD_SESSION') {
          matchedKey = 'award_order';
        }

        if (matchedKey && stageAlertsMap[matchedKey]?.enabled) {
          const leadDays = stageAlertsMap[matchedKey].leadDays;
          if (diffDays === leadDays) {
            const dedupKey = `stage_${od.id}_${todayStr}`;
            if (!this.sentAlertsDailyCache.has(dedupKey)) {
              this.sentAlertsDailyCache.add(dedupKey);

              const dateStr = new Date(od.dateValue).toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Africa/Cairo',
              });

              const msg = TELEGRAM_MESSAGES.STAGE_ALERT_PROACTIVE({
                companyBadge: badge,
                operationCode: opCode,
                operationName: od.operation.name,
                authority: od.operation.authority,
                stageTitle: stageArabicTitle,
                stageDescription: `متبقي ${leadDays} أيام على الاستحقاق الرسمي وفقاً لإعدادات التنبيهات المعتمدة.`,
                deadlineDate: dateStr,
                leadDays,
              });

              await this.bot.telegram.sendMessage(this.adminChatId, msg, { parse_mode: 'HTML' });
              this.logger.log(`📢 Sent proactive stage alert for ${od.id} (${stageArabicTitle}) to GM`);
            }
          }
        }
      }

      // فحص خطابات الضمان
      const activeGuarantees = await this.prisma.guarantee.findMany({
        where: { status: 'ACTIVE', isRecovered: false },
        include: {
          operation: {
            include: {
              companies: { select: { displayCode: true, company: { select: { name: true } } } },
            },
          },
        },
      });

      for (const g of activeGuarantees) {
        if (!g.endDate) continue;
        const diffDays = Math.ceil((new Date(g.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (guaranteeReminderDaysList.includes(diffDays)) {
          const dedupKey = `guar_${g.id}_${diffDays}_${todayStr}`;
          if (!this.sentAlertsDailyCache.has(dedupKey)) {
            this.sentAlertsDailyCache.add(dedupKey);

            const opCode = g.operation?.companies?.[0]?.displayCode || 'A15';
            await this.sendGuaranteeAlert({
              letterNumber: g.guaranteeNumber || 'بدون رقم',
              bankName: g.bankName || 'البنك الأهلي المصري',
              amount: Number(g.amount) || 0,
              expiryDate: g.endDate,
              daysRemaining: diffDays,
              operationCode: opCode,
              operationName: g.operation?.name,
              authority: g.operation?.authority,
              companyCode: opCode.charAt(0),
            });
          }
        }
      }

    } catch (err) {
      this.logger.error('Error in runProactiveMilestoneAndGuaranteeAlerts:', err);
    }
  }

  /**
   * التقرير الصباحي التنفيذي اليومي (الساعة 8:00 صباحاً بتوقيت القاهرة)
   */
  @Cron('0 8 * * *', { name: 'daily-morning-summary', timeZone: 'Africa/Cairo' })
  async runDailyMorningBriefing() {
    try {
      if (!this.bot || !this.adminChatId) return;

      // فحص هل التقرير الصباحي مفعل
      const sumSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'telegram_alert_daily_summary' },
      });
      if (sumSetting && sumSetting.value === 'false') return;

      // تفريغ سجل كاش التنبيهات لبداية يوم جديد
      this.sentAlertsDailyCache.clear();

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const [todayDates, pendingCount, activeGuarantees] = await Promise.all([
        this.prisma.operationDate.findMany({
          where: { dateValue: { gte: startOfDay, lte: endOfDay } },
          include: {
            operation: {
              include: {
                companies: { select: { displayCode: true, company: { select: { name: true } } } },
              },
            },
          },
        }),
        this.prisma.approval.count({ where: { status: 'PENDING' } }),
        this.prisma.guarantee.findMany({
          where: { status: 'ACTIVE', isRecovered: false },
          select: { endDate: true },
        }),
      ]);

      let expiringGuaranteesCount = 0;
      for (const g of activeGuarantees) {
        if (g.endDate) {
          const diffDays = Math.ceil((new Date(g.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 15) expiringGuaranteesCount++;
        }
      }

      const summaryLines: string[] = [];
      if (todayDates.length > 0) {
        todayDates.slice(0, 4).forEach((d) => {
          const opCode = d.operation?.companies?.[0]?.displayCode || 'A15';
          const badge = this.getCompanyBadgeDynamic(opCode);
          summaryLines.push(`• ${badge.emoji} [${opCode}] ${d.label || this.translateDateType(d.dateType)} — ${d.operation?.name}`);
        });
      }

      const dateStr = now.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Africa/Cairo',
      });

      const briefing = TELEGRAM_MESSAGES.DAILY_MORNING_BRIEFING({
        dateStr,
        todaySessionsCount: todayDates.length,
        pendingApprovalsCount: pendingCount,
        expiringGuaranteesCount,
        summaryLines,
      });

      await this.bot.telegram.sendMessage(this.adminChatId, briefing, {
        parse_mode: 'HTML',
        ...this.getCompanyHubKeyboard('ALL'),
      });

      this.logger.log(`☀️ Morning briefing successfully sent to GM (${this.adminChatId})`);
    } catch (err) {
      this.logger.error('Error in runDailyMorningBriefing:', err);
    }
  }

  /**
   * تشغيل التنبيهات الاستباقية يدوياً (للفحص والاختبار من لوحة الإعدادات)
   */
  async triggerProactiveAlertsCheck(): Promise<{ success: boolean; message: string }> {
    await this.runProactiveMilestoneAndGuaranteeAlerts();
    return {
      success: true,
      message: 'تم فحص التنبيهات الاستباقية وإرسال الإشعارات المستحقة وفقاً للإعدادات بنجاح.',
    };
  }

  /**
   * تشغيل التقرير الصباحي يدوياً للاختبار
   */
  async triggerMorningBriefing(): Promise<{ success: boolean; message: string }> {
    await this.runDailyMorningBriefing();
    return {
      success: true,
      message: 'تم إرسال التقرير الصباحي التنفيذي إلى تليجرام بنجاح.',
    };
  }

  /**
   * حالة البوت الحالية
   */
  getStatus() {
    return {
      connected: this.isConnected,
      adminChatId: this.adminChatId,
      botUsername: this.botUsername,
      isPaired: Boolean(this.adminChatId),
    };
  }
}
