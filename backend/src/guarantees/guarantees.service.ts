import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateGuaranteeDto } from './dto/create-guarantee.dto.js';
import { UpdateGuaranteeDto } from './dto/update-guarantee.dto.js';
import { GuaranteeStatus } from '@prisma/client';

@Injectable()
export class GuaranteesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { operationId?: string; status?: GuaranteeStatus; type?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.operationId) where.operationId = filters.operationId;
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;

    return this.prisma.guarantee.findMany({
      where,
      include: {
        operation: {
          select: {
            id: true, name: true, authority: true,
            companies: { include: { company: { select: { id: true, name: true, code: true } } } },
          },
        },
        notifications: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const guarantee = await this.prisma.guarantee.findUnique({
      where: { id },
      include: {
        operation: {
          include: {
            companies: { include: { company: true } },
          },
        },
        notifications: { orderBy: { daysBefore: 'desc' } },
      },
    });
    if (!guarantee) throw new NotFoundException('التأمين غير موجود');
    return guarantee;
  }

  async create(dto: CreateGuaranteeDto) {
    // Create guarantee with reminder notifications
    const guarantee = await this.prisma.guarantee.create({
      data: {
        operationId: dto.operationId,
        companyId: dto.companyId,
        type: dto.type,
        paymentMethod: dto.paymentMethod,
        amount: dto.amount,
        percentage: dto.percentage,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        duration: dto.duration,
        bankName: dto.bankName,
        bankBranch: dto.bankBranch,
        guaranteeNumber: dto.guaranteeNumber,
        receiptNumber: dto.receiptNumber,
        treasury: dto.treasury,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
        notes: dto.notes,
      },
    });

    // Create reminder notifications (30, 15, 10, 5 days before expiry)
    if (dto.endDate) {
      const reminderDays = [30, 15, 10, 5];
      await this.prisma.guaranteeNotification.createMany({
        data: reminderDays.map((days) => ({
          guaranteeId: guarantee.id,
          daysBefore: days,
        })),
      });
    }

    return this.findOne(guarantee.id);
  }

  async update(id: string, dto: UpdateGuaranteeDto) {
    await this.findOne(id);
    return this.prisma.guarantee.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
      },
      include: { operation: true, notifications: true },
    });
  }

  async requestRecovery(id: string, data: {
    recoveryLetterDate?: string;
    recoveryLetterPath?: string;
    paymentOrderDate?: string;
    paymentOrderPath?: string;
  }) {
    await this.findOne(id);
    return this.prisma.guarantee.update({
      where: { id },
      data: {
        status: 'RECOVERY_REQUESTED',
        recoveryLetterDate: data.recoveryLetterDate ? new Date(data.recoveryLetterDate) : undefined,
        recoveryLetterPath: data.recoveryLetterPath,
        paymentOrderDate: data.paymentOrderDate ? new Date(data.paymentOrderDate) : undefined,
        paymentOrderPath: data.paymentOrderPath,
      },
    });
  }

  async markRecovered(id: string, data: {
    actualRecoveryDate: string;
    deliveredTo?: string;
    deliveryReceiptPath?: string;
  }) {
    await this.findOne(id);
    return this.prisma.guarantee.update({
      where: { id },
      data: {
        status: 'RECOVERED',
        isRecovered: true,
        actualRecoveryDate: new Date(data.actualRecoveryDate),
        deliveredTo: data.deliveredTo,
        deliveryReceiptPath: data.deliveryReceiptPath,
      },
    });
  }

  // Called by cron job — check expiring guarantees
  async getExpiring(daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.guarantee.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { lte: futureDate },
        isRecovered: false,
      },
      include: {
        operation: {
          select: { name: true, authority: true },
        },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  async getStats() {
    const [total, active, expiringSoon, recovered] = await Promise.all([
      this.prisma.guarantee.count(),
      this.prisma.guarantee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.guarantee.count({ where: { status: 'EXPIRING_SOON' } }),
      this.prisma.guarantee.count({ where: { status: 'RECOVERED' } }),
    ]);
    return { total, active, expiringSoon, recovered };
  }
}
