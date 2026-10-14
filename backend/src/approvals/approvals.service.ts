import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApprovalStatus, ApprovalType, UserRole } from '@prisma/client';
import { CreateApprovalDto, UpdateApprovalDto } from './dto/approval.dto.js';
import { randomBytes } from 'crypto';
import { TelegramService } from '../telegram/telegram.service.js';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {}

  async findAll(filters?: { status?: ApprovalStatus; company?: string; requestedBy?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.requestedBy) where.requestedBy = { contains: filters.requestedBy };
    if (filters?.company && filters.company !== 'ALL') {
      where.operationCode = { startsWith: filters.company.toUpperCase() };
    }

    return this.prisma.approval.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const approval = await this.prisma.approval.findUnique({ where: { id } });
    if (!approval) throw new NotFoundException('طلب الموافقة غير موجود');
    return approval;
  }

  async createApproval(data: CreateApprovalDto, user: { sub: string; username: string; role: string }) {
    const isGeneralManager = user.role === UserRole.GENERAL_MANAGER;
    let finalStatus: ApprovalStatus = ApprovalStatus.PENDING;
    let approvedBy: string | null = null;
    let approvedAt: Date | null = null;
    let finalNotes = data.notes || '';

    // Only GENERAL_MANAGER can directly issue an instantly APPROVED print order
    if (isGeneralManager && data.status === ApprovalStatus.APPROVED) {
      finalStatus = ApprovalStatus.APPROVED;
      const securityHash = randomBytes(16).toString('hex').toUpperCase();
      approvedBy = 'المدير العام (الإدارة العليا)';
      approvedAt = new Date();
      finalNotes = `[HASH: ${securityHash}] — ${finalNotes || 'أمر طباعة معتمد صادر فورياً من الإدارة العليا'}`;
    } else {
      // Deputy Manager or Employee: always submitted as PENDING to administration
      finalStatus = ApprovalStatus.PENDING;
      approvedBy = null;
      approvedAt = null;
    }

    const created = await this.prisma.approval.create({
      data: {
        type: data.type,
        entityType: data.entityType || 'document',
        entityId: data.entityId || `op-${Date.now()}`,
        requestedBy: data.requestedBy || (isGeneralManager ? 'المدير العام' : user.role === UserRole.DEPUTY_MANAGER ? 'نائب المدير العام' : user.username),
        status: finalStatus,
        documentTitle: data.documentTitle,
        operationCode: data.operationCode ? data.operationCode.toUpperCase() : 'A15',
        operationName: data.operationName || 'عملية مناقصة وتوريد مسجلة',
        notes: finalNotes,
        approvedBy,
        approvedAt,
      },
    });

    // If pending, dispatch to General Manager's Telegram
    if (created.status === ApprovalStatus.PENDING) {
      this.telegramService.sendPrintApprovalRequest({
        id: created.id,
        documentTitle: created.documentTitle,
        operationCode: created.operationCode,
        operationName: created.operationName,
        requestedBy: created.requestedBy,
        requestedAt: created.requestedAt,
        notes: created.notes,
      }).catch(() => {});
    }

    return created;
  }

  async updateApproval(id: string, data: UpdateApprovalDto) {
    const existing = await this.findOne(id);

    const updateData: Record<string, unknown> = {};
    if (data.type) updateData.type = data.type;
    if (data.documentTitle) updateData.documentTitle = data.documentTitle;
    if (data.operationCode) updateData.operationCode = data.operationCode.toUpperCase();
    if (data.operationName) updateData.operationName = data.operationName;
    if (data.notes !== undefined) {
      // Preserve hash if item was approved
      const hashMatch = existing.notes?.match(/\[HASH:\s*([A-F0-9]{32})\]/);
      if (hashMatch && !data.notes?.includes(hashMatch[1])) {
        updateData.notes = `[HASH: ${hashMatch[1]}] — ${data.notes || ''}`.trim();
      } else {
        updateData.notes = data.notes;
      }
    }

    return this.prisma.approval.update({
      where: { id },
      data: updateData,
    });
  }

  async approve(id: string, user: { sub: string; username: string; role: string }, notes?: string) {
    const approval = await this.findOne(id);
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new ForbiddenException('هذا الطلب تم التصرف فيه بالفعل');
    }

    // Generate unique 32-character security hash (رمز التشفير الحكومي المعتمد)
    const securityHash = randomBytes(16).toString('hex').toUpperCase();
    const cleanNotes = notes || approval.notes?.replace(/\[HASH:\s*[A-F0-9]{32}\]\s*—?\s*/, '') || 'تم الاعتماد بنجاح وتوليد رمز الحوكمة التشفيري للطباعة الرسمية';
    const finalNotes = `[HASH: ${securityHash}] — ${cleanNotes}`;

    const approverTitle = user.role === UserRole.GENERAL_MANAGER ? 'المدير العام' : 'نائب المدير العام';

    return this.prisma.approval.update({
      where: { id },
      data: {
        status: ApprovalStatus.APPROVED,
        approvedBy: approverTitle,
        approvedAt: new Date(),
        notes: finalNotes,
      },
    });
  }

  async reject(id: string, user: { sub: string; username: string; role: string }, notes?: string) {
    const approval = await this.findOne(id);
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new ForbiddenException('هذا الطلب تم التصرف فيه بالفعل');
    }

    const approverTitle = user.role === UserRole.GENERAL_MANAGER ? 'المدير العام' : 'نائب المدير العام';

    return this.prisma.approval.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        approvedBy: approverTitle,
        approvedAt: new Date(),
        notes: notes || 'تم رفض طلب الاعتماد لمخالفة اللائحة أو نقص المستندات',
      },
    });
  }

  async getPendingCount(company?: string) {
    const where: Record<string, unknown> = { status: ApprovalStatus.PENDING };
    if (company && company !== 'ALL') {
      where.operationCode = { startsWith: company.toUpperCase() };
    }
    return this.prisma.approval.count({ where });
  }
}
