import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePurchaseDto } from './dto/create-purchase.dto.js';
import { AddPaymentDto } from './dto/add-payment.dto.js';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { supplierId?: string; operationId?: string; status?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.supplierId) where.supplierId = filters.supplierId;
    if (filters?.operationId) where.operationId = filters.operationId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        operation: { select: { id: true, name: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        operation: { include: { companies: { include: { company: true } } } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });
    if (!purchase) throw new NotFoundException('المشترية غير موجودة');
    return purchase;
  }

  async create(dto: CreatePurchaseDto) {
    return this.prisma.purchase.create({
      data: {
        operationId: dto.operationId || null,
        supplierId: dto.supplierId,
        totalAmount: dto.totalAmount,
        remaining: dto.totalAmount,
        description: dto.description,
        notes: dto.notes,
      },
      include: { supplier: true, operation: true },
    });
  }

  async addPayment(purchaseId: string, dto: AddPaymentDto) {
    const purchase = await this.findOne(purchaseId);
    const newPaid = Number(purchase.paidAmount) + dto.amount;
    const newRemaining = Number(purchase.totalAmount) - newPaid;

    if (newRemaining < 0) {
      throw new BadRequestException('المبلغ المدفوع يتجاوز إجمالي المشترية');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.supplierPayment.create({
        data: {
          purchaseId,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod,
          receiptPath: dto.receiptPath,
          notes: dto.notes,
        },
      });

      return tx.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaid,
          remaining: newRemaining,
          status: newRemaining === 0 ? 'PAID' : 'PARTIALLY_PAID',
        },
        include: { supplier: true, payments: true },
      });
    });
  }

  async getStats() {
    const purchases = await this.prisma.purchase.findMany({
      select: { totalAmount: true, paidAmount: true, remaining: true, status: true },
    });
    const totalDue = purchases.reduce((s, p) => s + Number(p.totalAmount), 0);
    const totalPaid = purchases.reduce((s, p) => s + Number(p.paidAmount), 0);
    const unpaid = purchases.filter(p => p.status === 'UNPAID').length;
    const partiallyPaid = purchases.filter(p => p.status === 'PARTIALLY_PAID').length;
    return { totalDue, totalPaid, remaining: totalDue - totalPaid, unpaid, partiallyPaid };
  }
}
