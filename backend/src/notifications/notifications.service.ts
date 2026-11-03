import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationType, NotificationChannel, OperationDateType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Sync real system events into Notification records:
   * 1. Pending approval requests in the Approvals table
   * 2. Active guarantees nearing expiration
   * 3. Upcoming operation session deadlines (technical & financial opening)
   * 4. Purge any legacy dummy mock notifications permanently
   */
  async syncRealSystemEvents(): Promise<void> {
    try {
      // 1. Purge legacy dummy mock notifications if present
      await this.prisma.notification.deleteMany({
        where: {
          OR: [
            { id: { startsWith: 'notif-' } },
            { title: { contains: 'محولات كهرباء' } },
            { title: { contains: 'سداد التأمين الابتدائي بخزينة الجهة' } },
            { title: { contains: 'طلب اعتماد طباعة العرض الفني النهائي' } },
            { title: { contains: 'خوادم جامعة حلوان' } },
            { title: { contains: 'خوادم التعليم العالي' } },
            { title: { contains: 'أجهزة الرصد البيئي' } },
            { title: { contains: 'لوحات التوزيع والتحكم' } },
            { title: { contains: 'مجمع المحاكم' } },
            { title: { contains: 'الطاقة الذرية' } },
            { title: { contains: 'شبكات الألياف' } },
            { title: { contains: 'تتطلب قرار واعتماد الإدارة' } },
            { message: { contains: 'شركة توزيع كهرباء شمال القاهرة' } },
            { message: { contains: 'مستشفيات عين شمس وتنتظر موافقة' } },
            { message: { contains: 'بنك الإسكندرية' } },
          ],
        },
      }).catch(() => {});

      // 2. Synchronize active pending approvals from approvals table
      const pendingApprovals = await this.prisma.approval.findMany({
        where: { status: 'PENDING' },
        orderBy: { requestedAt: 'desc' },
        take: 30,
      });

      for (const app of pendingApprovals) {
        const existing = await this.prisma.notification.findFirst({
          where: { entityType: 'APPROVAL', entityId: app.id },
        });

        if (!existing) {
          const compCode = (app.operationCode ? app.operationCode.charAt(0) : 'A').toUpperCase();
          await this.prisma.notification.create({
            data: {
              type: NotificationType.APPROVAL_REQUEST,
              title: `طلب اعتماد طباعة: ${app.documentTitle || 'مستند رسمي'} (${app.operationCode || compCode})`,
              message: `طلب اعتماد رسمي صادر من ${app.requestedBy} لعملية "${app.operationName || app.operationCode || 'مناقصة مسجلة'}". بانتظار قرار الإدارة العليا.`,
              entityType: 'APPROVAL',
              entityId: app.id,
              channel: NotificationChannel.SYSTEM,
              isRead: false,
              createdAt: app.requestedAt || new Date(),
            },
          });
        }
      }

      // Mark notifications as read if approval was already resolved (APPROVED/REJECTED)
      const resolvedApprovals = await this.prisma.approval.findMany({
        where: { status: { in: ['APPROVED', 'REJECTED'] } },
        select: { id: true },
        take: 50,
      });
      if (resolvedApprovals.length > 0) {
        const resolvedIds = resolvedApprovals.map((a) => a.id);
        await this.prisma.notification.updateMany({
          where: {
            entityType: 'APPROVAL',
            entityId: { in: resolvedIds },
            title: { startsWith: 'طلب اعتماد طباعة' },
            isRead: false,
          },
          data: { isRead: true, readAt: new Date() },
        }).catch(() => {});
      }

      // 3. Synchronize active guarantees expiring within 14 days or expired
      const nearFuture = new Date();
      nearFuture.setDate(nearFuture.getDate() + 14);

      const expiringGuarantees = await this.prisma.guarantee.findMany({
        where: {
          status: 'ACTIVE',
          isRecovered: false,
          endDate: { lte: nearFuture },
        },
        include: {
          operation: {
            select: {
              id: true,
              name: true,
              externalNumber: true,
              companies: { select: { displayCode: true, company: { select: { code: true } } } },
            },
          },
        },
        take: 30,
      });

      for (const g of expiringGuarantees) {
        const existing = await this.prisma.notification.findFirst({
          where: { entityType: 'GUARANTEE', entityId: g.id },
        });

        if (!existing) {
          const op = g.operation;
          const compCode = (op?.companies?.[0]?.company?.code || op?.companies?.[0]?.displayCode?.charAt(0) || 'A').toUpperCase();
          const isPast = g.endDate ? new Date(g.endDate) < new Date() : false;
          const gTypeLabel = g.type === 'FINAL' ? 'النهائي' : 'الابتدائي';
          const formattedDate = g.endDate ? new Date(g.endDate).toLocaleDateString('ar-EG') : 'قريباً';

          await this.prisma.notification.create({
            data: {
              type: NotificationType.GUARANTEE_EXPIRY,
              title: isPast
                ? `تنبيه: انتهاء خطاب الضمان ${gTypeLabel} (${compCode})`
                : `اقتراب موعد انتهاء خطاب الضمان ${gTypeLabel} (${compCode})`,
              message: `خطاب الضمان ${gTypeLabel} برقم (${g.guaranteeNumber || '---'}) ببنك ${g.bankName || 'المصرف'} بمبلغ ${Number(g.amount).toLocaleString('ar-EG')} ج.م يستحق في ${formattedDate}. مطلوب اتخاذ إجراء التمديد أو الاسترداد.`,
              entityType: 'GUARANTEE',
              entityId: g.id,
              channel: NotificationChannel.SYSTEM,
              isRead: false,
              createdAt: g.createdAt || new Date(),
            },
          });
        }
      }

      // 4. Synchronize upcoming session dates (opening envelopes within next 7 days)
      const sessionNearFuture = new Date();
      sessionNearFuture.setDate(sessionNearFuture.getDate() + 7);
      const sessionNearPast = new Date();
      sessionNearPast.setDate(sessionNearPast.getDate() - 1);

      const upcomingSessions = await this.prisma.operationDate.findMany({
        where: {
          dateType: { in: [OperationDateType.TECHNICAL_OPENING, OperationDateType.FINANCIAL_OPENING, OperationDateType.BOOKLET_DEADLINE] },
          dateValue: { gte: sessionNearPast, lte: sessionNearFuture },
        },
        include: {
          operation: {
            select: {
              id: true,
              name: true,
              externalNumber: true,
              companies: { select: { displayCode: true, company: { select: { code: true } } } },
            },
          },
        },
        take: 30,
      });

      for (const sess of upcomingSessions) {
        const existing = await this.prisma.notification.findFirst({
          where: { entityType: 'OPERATION_DATE', entityId: sess.id },
        });

        if (!existing) {
          const op = sess.operation;
          const compCode = (op?.companies?.[0]?.company?.code || op?.companies?.[0]?.displayCode?.charAt(0) || 'A').toUpperCase();
          const sessLabel =
            sess.dateType === OperationDateType.TECHNICAL_OPENING
              ? 'جلسة فتح المظاريف الفنية'
              : sess.dateType === OperationDateType.FINANCIAL_OPENING
              ? 'جلسة فتح المظاريف المالية'
              : 'آخر موعد لشراء كراسة الشروط';
          const formattedDate = new Date(sess.dateValue).toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          await this.prisma.notification.create({
            data: {
              type: NotificationType.DEADLINE_REMINDER,
              title: `موعد ${sessLabel} — (${compCode})`,
              message: `العملية: "${op.name}" (${op.externalNumber || compCode}). الموعد المحدد: ${formattedDate}. يرجى استكمال التجهيزات الإلزامية.`,
              entityType: 'OPERATION_DATE',
              entityId: sess.id,
              channel: NotificationChannel.SYSTEM,
              isRead: false,
              createdAt: new Date(),
            },
          });
        }
      }
    } catch (err) {
      // Gracefully continue without breaking request flow
      console.warn('Notification synchronization notice:', (err as any)?.message || err);
    }
  }

  async findAll(recipientId?: string, unreadOnly?: boolean, company?: string) {
    // Sync real business events first
    await this.syncRealSystemEvents();

    const conditions: Record<string, unknown>[] = [];

    if (recipientId) {
      conditions.push({
        OR: [
          { recipientId },
          { recipientId: null },
        ],
      });
    }

    if (unreadOnly) {
      conditions.push({ isRead: false });
    }

    if (company && company !== 'ALL') {
      const code = company.toUpperCase();
      conditions.push({
        OR: [
          { entityId: code },
          { entityType: `COMPANY_${code}` },
          { entityType: code },
          { title: { contains: `(${code}` } },
          { message: { contains: `(${code}` } },
          { title: { contains: `شركة ${code}` } },
        ],
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const list = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Enrich notifications with companyCode, link, and action labels
    return list.map((item) => {
      let companyCode = 'ALL';
      if (['A', 'B', 'C', 'D'].includes(item.entityId || '')) {
        companyCode = item.entityId!;
      } else if (item.entityType?.startsWith('COMPANY_')) {
        companyCode = item.entityType.replace('COMPANY_', '');
      } else {
        const match = item.title?.match(/\(([ABCD])\d*\)/i) || item.message?.match(/\(([ABCD])\d*\)/i);
        if (match && match[1]) {
          companyCode = match[1].toUpperCase();
        }
      }

      let link = '/dashboard/operations';
      let actionLabel = 'عرض التفاصيل';

      if (item.type === NotificationType.APPROVAL_REQUEST) {
        link = `/dashboard/approvals?company=${companyCode === 'ALL' ? '' : companyCode}`;
        actionLabel = item.title.includes('تم اعتماد') ? 'عرض السجل' : 'مراجعة الاعتماد';
      } else if (item.type === NotificationType.GUARANTEE_EXPIRY) {
        link = '/dashboard/operations';
        actionLabel = 'متابعة الضمان';
      } else if (item.type === NotificationType.DEADLINE_REMINDER) {
        link = '/dashboard/operations';
        actionLabel = 'تفاصيل الجلسة';
      }

      return {
        ...item,
        companyCode,
        link,
        actionLabel,
      };
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markEntityNotificationsRead(entityType: string, entityId: string) {
    return this.prisma.notification.updateMany({
      where: { entityType, entityId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(recipientId?: string, company?: string) {
    const conditions: Record<string, unknown>[] = [{ isRead: false }];

    if (recipientId) {
      conditions.push({
        OR: [
          { recipientId },
          { recipientId: null },
        ],
      });
    }

    if (company && company !== 'ALL') {
      const code = company.toUpperCase();
      conditions.push({
        OR: [
          { entityId: code },
          { entityType: `COMPANY_${code}` },
          { entityType: code },
          { title: { contains: `(${code}` } },
          { message: { contains: `(${code}` } },
        ],
      });
    }

    return this.prisma.notification.updateMany({
      where: { AND: conditions },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async create(data: {
    type: NotificationType;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    recipientId?: string;
    channel?: NotificationChannel;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
        recipientId: data.recipientId,
        channel: data.channel || 'SYSTEM',
      },
    });

    if (data.channel === 'TELEGRAM') {
      await this.sendTelegram(data.message);
    }

    return notification;
  }

  async getUnreadCount(recipientId?: string, company?: string) {
    const conditions: Record<string, unknown>[] = [{ isRead: false }];

    if (recipientId) {
      conditions.push({
        OR: [
          { recipientId },
          { recipientId: null },
        ],
      });
    }

    if (company && company !== 'ALL') {
      const code = company.toUpperCase();
      conditions.push({
        OR: [
          { entityId: code },
          { entityType: `COMPANY_${code}` },
          { entityType: code },
          { title: { contains: `(${code}` } },
          { message: { contains: `(${code}` } },
        ],
      });
    }

    return this.prisma.notification.count({ where: { AND: conditions } });
  }

  // --- Telegram ---
  private async sendTelegram(message: string, chatId?: string): Promise<boolean> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const defaultChatId = chatId || this.config.get<string>('TELEGRAM_MANAGER_CHAT_ID');

    if (!token || !defaultChatId) return false;

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: defaultChatId,
            text: `🔔 GoldenERP\n\n${message}`,
            parse_mode: 'HTML',
          }),
        },
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async sendApprovalRequest(type: string, details: string) {
    const managerChatId = this.config.get<string>('TELEGRAM_MANAGER_CHAT_ID');
    const deputyChatId = this.config.get<string>('TELEGRAM_DEPUTY_CHAT_ID');

    const message = `⚠️ طلب موافقة: ${type}\n\n${details}`;

    const sent = await this.sendTelegram(message, managerChatId);
    if (!sent && deputyChatId) {
      await this.sendTelegram(message, deputyChatId);
    }
  }
}
