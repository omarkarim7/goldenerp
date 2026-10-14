import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service.js';
import { TELEGRAM_MESSAGES, getCompanyBadge } from './telegram.constants.js';
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('TelegramService');
  private bot: Telegraf | null = null;
  private adminChatId: string | null = null;
  private isConnected = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    let token = this.config.get<string>('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN;
    let configuredChatId = this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID') || process.env.TELEGRAM_ADMIN_CHAT_ID;

    // قراءة القيم الطازجة من ملف .env مباشرة لضمان عدم الاعتماد على كاش الذاكرة
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

    // القيمة الافتراضية للتوكن إذا لم توجد
    if (!token || !token.trim()) {
      token = '8887272650:AAED3QzSPKcR6S9wRL2GBx94GitTHrzVgOM';
    }

    if (configuredChatId && configuredChatId.trim()) {
      this.adminChatId = configuredChatId.trim();
      this.logger.log(`🔒 Telegram Admin Chat ID locked to: ${this.adminChatId}`);
    }

    try {
      this.bot = new Telegraf(token);
      this.registerHandlers();

      // تشغيل البوت عبر تقنية الاستطلاع (Long Polling)
      this.bot.launch({
        allowedUpdates: ['message', 'callback_query'],
      }).then(() => {
        this.isConnected = true;
        this.logger.log('🚀 GoldenERP VIP Telegram Bot launched successfully via polling!');
      }).catch((err) => {
        this.logger.error('❌ Failed to launch Telegram Bot polling:', err);
      });

      // تسجيل الأوامر الرسمية المختصرة في قائمة تليجرام
      this.bot.telegram.setMyCommands([
        { command: 'pending', description: 'طلبات الاعتماد العالقة للموافقة' },
        { command: 'today', description: 'جلسات ومواعيد العمليات اليوم' },
        { command: 'stats', description: 'ملخص نسب الترسية والأداء المالي' },
        { command: 'start', description: 'تشغيل البوت والتأكد من الاتصال' },
        { command: 'help', description: 'دليل استخدام المساعد التنفيذي' },
      ]).catch(() => {});

      const botInfo = await this.bot.telegram.getMe();
      this.logger.log(`🤖 Telegram Bot authenticated: @${botInfo.username} (${botInfo.first_name})`);

    } catch (err) {
      this.logger.error('❌ Error initializing Telegram Bot:', err);
    }
  }

  onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('SIGINT');
      this.logger.log('🛑 Telegram Bot stopped.');
    }
  }

  /**
   * تسجيل المستمعين والأوامر الخاصة بالمدير العام
   */
  private registerHandlers() {
    if (!this.bot) return;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. أمر البداية والتفعيل /start
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('start', async (ctx) => {
      const currentChatId = String(ctx.chat.id);
      const senderName = ctx.from.first_name || 'السيد المدير العام';

      // إذا لم يكن المعرف محدداً مسبقاً، نقوم بربطه وتثبيته فوراً كمعرف المدير العام
      if (!this.adminChatId) {
        this.adminChatId = currentChatId;
        this.persistAdminChatId(currentChatId);
        this.logger.log(`🔑 Automatically paired and locked Telegram Admin Chat ID to: ${currentChatId} (${senderName})`);
      } else if (this.adminChatId !== currentChatId) {
        // حظر أي شخص آخر غير المدير العام
        await ctx.replyWithHTML(TELEGRAM_MESSAGES.UNAUTHORIZED_ACCESS);
        return;
      }

      await ctx.replyWithHTML(
        TELEGRAM_MESSAGES.WELCOME_BOSS(senderName, currentChatId),
        Markup.inlineKeyboard([
          [Markup.button.callback('📋 عرض الطلبات المعلقة', 'cmd_pending')],
          [
            Markup.button.callback('📅 جدول اليوم', 'cmd_today'),
            Markup.button.callback('📊 ملخص الأداء', 'cmd_stats'),
          ],
        ])
      );
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. أمر عرض الطلبات المعلقة /pending
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('pending', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await this.handlePendingCommand(ctx);
    });

    this.bot.action('cmd_pending', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await ctx.answerCbQuery();
      await this.handlePendingCommand(ctx);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. أمر جدول اليوم /today
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('today', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await this.handleTodayCommand(ctx);
    });

    this.bot.action('cmd_today', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await ctx.answerCbQuery();
      await this.handleTodayCommand(ctx);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. أمر إحصائيات الأداء /stats
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('stats', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await this.handleStatsCommand(ctx);
    });

    this.bot.action('cmd_stats', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await ctx.answerCbQuery();
      await this.handleStatsCommand(ctx);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. أمر المساعدة /help
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    this.bot.command('help', async (ctx) => {
      if (!this.isAuthorizedUser(ctx)) return;
      await ctx.replyWithHTML(`
🏛️ <b>دليل استخدام المساعد التنفيذي للمدير العام:</b>
━━━━━━━━━━━━━━━━━━━━━━
• <b>طلبات الطباعة:</b> عند طلب أي موظف طباعة مستند، ستصلك رسالة فورية مع توضيح الشركة التابعة (أ، ب، ج، د) وأزرار اعتماد ورفض فورية.
• <b>الاعتماد اللحظي:</b> بمجرد ضغط [✅ اعتماد]، يولد النظام الهاش الأمني ويفتح الطباعة فوراً في المنظومة.
• <b>الأوامر السريعة المتاحة:</b>
  /pending — قائمة الطلبات المعلقة مع تحديد الشركة
  /today — جدول مواعيد وجلسات اليوم
  /stats — إحصائيات الفوز والمناقصات للشركات
━━━━━━━━━━━━━━━━━━━━━━
      `.trim());
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6. زر الاعتماد الرسمي وتوليد الهاش [ approve_print_{id} ]
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

        // توليد الهاش الأمني المعتمد (SHA-256 / 32 hex chars)
        const securityHash = randomBytes(16).toString('hex').toUpperCase();
        const approvedAt = new Date();
        const dateStr = approvedAt.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
        const companyBadge = getCompanyBadge(approval.operationCode || undefined);

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

        // تعديل نص الرسالة في تليجرام لتعكس كود الهاش والاعتماد
        await ctx.editMessageText(
          TELEGRAM_MESSAGES.APPROVAL_CONFIRMED({
            documentTitle: updated.documentTitle || 'مستند رسمي معتمد',
            operationCode: updated.operationCode || 'A15',
            companyTitle: companyBadge.fullTitle,
            securityHash,
            approvedAt: dateStr,
          }),
          { parse_mode: 'HTML' }
        );

        this.logger.log(`🎯 Approval ${approvalId} APPROVED via Telegram by General Manager. Hash: ${securityHash}`);

      } catch (err) {
        this.logger.error('Error handling approve_print:', err);
        await ctx.answerCbQuery('❌ حدث خطأ أثناء معالجة الاعتماد', { show_alert: true });
      }
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 7. زر رفض الطلب [ reject_print_{id} ]
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
        const dateStr = rejectedAt.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
        const reason = 'تم الرفض بواسطة السيد المدير العام عبر تليجرام (بحاجة لمراجعة وتعديل)';
        const companyBadge = getCompanyBadge(approval.operationCode || undefined);

        const updated = await this.prisma.approval.update({
          where: { id: approvalId },
          data: {
            status: 'REJECTED',
            rejectedBy: 'السيد المدير العام (تليجرام)',
            rejectedAt,
            rejectionReason: reason,
          },
        });

        await ctx.answerCbQuery('❌ تم رفض الطلب وإلغاء صلاحية الطباعة في المنظومة', { show_alert: true });

        await ctx.editMessageText(
          TELEGRAM_MESSAGES.REJECTION_CONFIRMED({
            documentTitle: updated.documentTitle || 'مستند رسمي',
            operationCode: updated.operationCode || 'A15',
            companyTitle: companyBadge.fullTitle,
            reason,
            rejectedAt: dateStr,
          }),
          { parse_mode: 'HTML' }
        );

        this.logger.log(`🚫 Approval ${approvalId} REJECTED via Telegram by General Manager.`);

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
        this.persistAdminChatId(currentChatId);
        this.logger.log(`🔑 Automatically paired Telegram Admin Chat ID to: ${currentChatId}`);
        await ctx.replyWithHTML(TELEGRAM_MESSAGES.WELCOME_BOSS(ctx.from.first_name || 'المدير العام', currentChatId));
        return;
      }

      if (this.adminChatId !== currentChatId) {
        await ctx.replyWithHTML(TELEGRAM_MESSAGES.UNAUTHORIZED_ACCESS);
        return;
      }

      // إذا كانت الرسالة من المدير العام وليست أمراً
      await ctx.replyWithHTML(`
مرحباً بحضرتك يا فندم 🌟
يرجى اختيار أحد الأوامر المتاحة من القائمة أدناه أو الضغط على /help:
      `.trim(), Markup.inlineKeyboard([
        [Markup.button.callback('📋 عرض الطلبات المعلقة', 'cmd_pending')],
        [
          Markup.button.callback('📅 جدول اليوم', 'cmd_today'),
          Markup.button.callback('📊 ملخص الأداء', 'cmd_stats'),
        ],
      ]));
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

  private persistAdminChatId(chatId: string) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf-8');
        if (content.includes('TELEGRAM_ADMIN_CHAT_ID=')) {
          content = content.replace(/TELEGRAM_ADMIN_CHAT_ID=.*/, `TELEGRAM_ADMIN_CHAT_ID="${chatId}"`);
        } else {
          content += `\nTELEGRAM_ADMIN_CHAT_ID="${chatId}"\n`;
        }
        fs.writeFileSync(envPath, content, 'utf-8');
        this.logger.log(`💾 Saved TELEGRAM_ADMIN_CHAT_ID=${chatId} to .env file`);
      }
    } catch (e) {
      this.logger.warn(`Could not persist Chat ID to .env: ${e}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // معالجات الأوامر التنفيذية
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private async handlePendingCommand(ctx: any) {
    try {
      const pendings = await this.prisma.approval.findMany({
        where: { status: 'PENDING' },
        orderBy: { requestedAt: 'desc' },
        take: 5,
      });

      if (pendings.length === 0) {
        await ctx.replyWithHTML(`
✅ <b>لا توجد طلبات اعتماد معلقة حالياً</b>
━━━━━━━━━━━━━━━━━━━━━━
جميع طلبات الطباعة والعقود معتمدة ومنجزة بنجاح لكافة الشركات الأربعة.
        `.trim());
        return;
      }

      await ctx.replyWithHTML(`
📋 <b>لديك (${pendings.length}) طلبات اعتماد طباعة تنتظر موافقتك:</b>
━━━━━━━━━━━━━━━━━━━━━━
      `.trim());

      for (const item of pendings) {
        const dateStr = new Date(item.requestedAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
        const companyBadge = getCompanyBadge(item.operationCode || undefined);

        const text = `
🏢 <b>الشركة التابعة:</b>
${companyBadge.emoji} <b>${companyBadge.fullTitle}</b>
──────────────────────
📄 <b>المستند المطلوب:</b> <b>${item.documentTitle}</b>
🏷️ <b>كود العملية:</b> <code>[${item.operationCode || 'A15'}]</code> — ${item.operationName}
👤 <b>المقدم:</b> ${item.requestedBy} (${dateStr})
${item.notes ? `📝 <i>${item.notes}</i>\n` : ''}
        `.trim();

        await ctx.replyWithHTML(
          text,
          Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ اعتماد وتوليد الهاش', `approve_print_${item.id}`),
              Markup.button.callback('❌ رفض', `reject_print_${item.id}`),
            ],
          ])
        );
      }
    } catch (err) {
      this.logger.error('Error in handlePendingCommand:', err);
      await ctx.reply('حدث خطأ أثناء استرجاع الطلبات المعلقة');
    }
  }

  private async handleTodayCommand(ctx: any) {
    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const endOfDay = new Date(now.setHours(23, 59, 59, 999));

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
              companies: { select: { displayCode: true, name: true } },
            },
          },
        },
      });

      if (todayDates.length === 0) {
        await ctx.replyWithHTML(`
📅 <b>جدول اليوم: لا توجد جلسات مناقصات مجدولة لتاريخ اليوم.</b>
━━━━━━━━━━━━━━━━━━━━━━
استمتع بيوم هادئ ومثمر يا فندم! 🌟
        `.trim());
        return;
      }

      let msg = `
📅 <b>جلسات ومواعيد العمليات المجدولة لليوم:</b>
━━━━━━━━━━━━━━━━━━━━━━\n`;

      todayDates.forEach((d, idx) => {
        const time = new Date(d.dateValue).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const code = d.operation.companies[0]?.displayCode || 'A15';
        const badge = getCompanyBadge(code, d.operation.companies[0]?.name);
        msg += `\n${idx + 1}. ${badge.emoji} <b>[${code}]</b> ${d.operation.name}\n   🏢 <b>الشركة:</b> ${badge.shortName}\n   ⚖️ <b>الحدث:</b> ${d.label || d.dateType} (الساعة: ${time})\n   🏛️ <b>الجهة:</b> ${d.operation.authority}\n`;
      });

      await ctx.replyWithHTML(msg);
    } catch (err) {
      this.logger.error('Error in handleTodayCommand:', err);
      await ctx.reply('حدث خطأ أثناء فحص جدول اليوم');
    }
  }

  private async handleStatsCommand(ctx: any) {
    try {
      const totalOps = await this.prisma.operation.count();
      const awardedOps = await this.prisma.operation.count({
        where: { status: { in: ['AWARDED', 'SUPPLY_IN_PROGRESS', 'COMPLETED'] } },
      });
      const activeOps = await this.prisma.operation.count({
        where: { status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED', 'ARCHIVED'] } },
      });
      const winRate = totalOps > 0 ? Math.round((awardedOps / totalOps) * 100) : 0;

      await ctx.replyWithHTML(`
📊 <b>المؤشرات التنفيذية للشركات الأربعة:</b>
━━━━━━━━━━━━━━━━━━━━━━
📁 <b>إجمالي العمليات المسجلة:</b> ${totalOps} عملية
🏆 <b>المناقصات الفائزة (ترسية):</b> ${awardedOps} عملية
⚡ <b>العمليات الجارية حالياً:</b> ${activeOps} عملية
📈 <b>معدل الفوز العام بالمناقصات:</b> <b>${winRate}%</b>
━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>توزيع الشركات الأربعة:</b>
• 🥇 <b>(أ) جولدن:</b> المجموعة الذهبية للتوريدات والمقاولات
• 🥈 <b>(ب) إكسلنت:</b> العالمية للتوريدات والتجارة العمومية
• 🥉 <b>(ج) العهد:</b> المتحدة للمقاولات العامة والتجارة
• 🎖️ <b>(د) الحديثة:</b> الحديثة للتجارة العامة والتوريدات
━━━━━━━━━━━━━━━━━━━━━━
<i>مؤشرات حية ومحدثة من قاعدة بيانات GoldenERP</i>
      `.trim());
    } catch (err) {
      this.logger.error('Error in handleStatsCommand:', err);
      await ctx.reply('حدث خطأ أثناء حساب الإحصائيات');
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // الخدمات الخارجية التي تستدعيها باقي أقسام المنظومة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * إرسال طلب اعتماد طباعة إلى هاتف المدير العام مصحوباً بالأزرار وتحديد الشركة
   */
  async sendPrintApprovalRequest(approval: any, pdfBuffer?: Buffer, pdfFilename?: string): Promise<boolean> {
    if (!this.bot || !this.adminChatId) {
      this.logger.warn(`⚠️ Cannot send print approval: bot=${Boolean(this.bot)}, adminChatId=${this.adminChatId}`);
      return false;
    }

    try {
      const dateStr = new Date(approval.requestedAt || Date.now()).toLocaleString('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      let opCode = approval.operationCode;
      let compName = approval.companyName;

      // فحص الشركة التابعة للعملية في قاعدة البيانات إذا لم تكن محددة بوضوح
      if ((!opCode || !compName) && approval.entityId) {
        try {
          const op = await this.prisma.operation.findUnique({
            where: { id: approval.entityId },
            include: { companies: { select: { displayCode: true, name: true } } },
          });
          if (op?.companies?.[0]) {
            opCode = opCode || op.companies[0].displayCode;
            compName = compName || op.companies[0].name;
          }
        } catch {}
      }

      const companyBadge = getCompanyBadge(opCode, compName);

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

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ اعتماد رسمي وتوليد الهاش', `approve_print_${approval.id}`),
          Markup.button.callback('❌ رفض الطلب', `reject_print_${approval.id}`),
        ],
      ]);

      // إذا كان هناك ملف PDF مرفق، نرسل الملف أولاً ثم رسالة الاعتماد
      if (pdfBuffer && pdfBuffer.length > 0) {
        await this.bot.telegram.sendDocument(
          this.adminChatId,
          {
            source: pdfBuffer,
            filename: pdfFilename || `${approval.documentTitle || 'مستند_معتمد'}.pdf`,
          },
          {
            caption: `📄 معاينة أصل المستند: <b>${approval.documentTitle}</b>\n🏢 ${companyBadge.fullTitle}`,
            parse_mode: 'HTML',
          }
        );
      }

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
   * إرسال تنبيه جلسة مناقصة
   */
  async sendSessionAlert(params: Parameters<typeof TELEGRAM_MESSAGES.SESSION_ALERT>[0]): Promise<boolean> {
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
   * حالة البوت الحالية
   */
  getStatus() {
    return {
      connected: this.isConnected,
      adminChatId: this.adminChatId,
      isPaired: Boolean(this.adminChatId),
    };
  }
}
