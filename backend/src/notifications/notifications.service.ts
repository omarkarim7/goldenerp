import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationType, NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findAll(recipientId?: string, unreadOnly?: boolean, company?: string) {
    const where: Record<string, unknown> = {};
    if (recipientId) where.recipientId = recipientId;
    if (unreadOnly) where.isRead = false;
    if (company && company !== 'ALL') {
      const code = company.toUpperCase();
      where.OR = [
        { entityId: code },
        { entityType: `COMPANY_${code}` },
        { title: { contains: `(${code}` } },
        { message: { contains: `(${code}` } },
        { title: { contains: code } },
      ];
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(recipientId?: string, company?: string) {
    const where: Record<string, unknown> = { isRead: false };
    if (recipientId) where.recipientId = recipientId;
    if (company && company !== 'ALL') {
      const code = company.toUpperCase();
      where.OR = [
        { entityId: code },
        { entityType: `COMPANY_${code}` },
        { title: { contains: `(${code}` } },
        { message: { contains: `(${code}` } },
      ];
    }

    return this.prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
  }

  async create(data: {
    type: NotificationType; title: string; message: string;
    entityType?: string; entityId?: string; recipientId?: string;
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

    // Send Telegram if channel is TELEGRAM
    if (data.channel === 'TELEGRAM') {
      await this.sendTelegram(data.message);
    }

    return notification;
  }

  async getUnreadCount(recipientId?: string, company?: string) {
    const where: Record<string, unknown> = { isRead: false };
    if (recipientId) where.recipientId = recipientId;
    if (company && company !== 'ALL') {
      const code = company.toUpperCase();
      where.OR = [
        { entityId: code },
        { entityType: `COMPANY_${code}` },
        { title: { contains: `(${code}` } },
        { message: { contains: `(${code}` } },
      ];
    }

    return this.prisma.notification.count({ where });
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

    // Try manager first, then deputy
    const sent = await this.sendTelegram(message, managerChatId);
    if (!sent && deputyChatId) {
      await this.sendTelegram(message, deputyChatId);
    }
  }
}
