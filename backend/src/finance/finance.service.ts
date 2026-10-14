import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(operationId?: string) {
    const where = operationId ? { operationId } : {};
    return this.prisma.operationFinance.findMany({
      where,
      include: { operation: { select: { id: true, name: true, authority: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.operationFinance.findUnique({
      where: { id },
      include: { operation: true },
    });
  }

  async create(data: {
    operationId: string; totalCost?: number; totalRevenue?: number;
    netProfit?: number; notes?: string;
  }) {
    return this.prisma.operationFinance.create({ data });
  }

  async update(id: string, data: Partial<{
    totalCost: number; totalRevenue: number; netProfit: number;
    finalReceiptDate: string; insuranceRecoveryDate: string;
    isClosed: boolean; notes: string;
  }>) {
    const updateData: any = { ...data };
    if (data.finalReceiptDate) updateData.finalReceiptDate = new Date(data.finalReceiptDate);
    if (data.insuranceRecoveryDate) updateData.insuranceRecoveryDate = new Date(data.insuranceRecoveryDate);
    if (data.isClosed) updateData.closedAt = new Date();
    return this.prisma.operationFinance.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    return this.prisma.operationFinance.delete({ where: { id } });
  }

  async getSummary() {
    const records = await this.prisma.operationFinance.findMany({
      select: { totalCost: true, totalRevenue: true, netProfit: true },
    });
    const totalCost = records.reduce((s, r) => s + Number(r.totalCost), 0);
    const totalRevenue = records.reduce((s, r) => s + Number(r.totalRevenue), 0);
    const netProfit = records.reduce((s, r) => s + Number(r.netProfit), 0);
    return { totalCost, totalRevenue, netProfit };
  }
}
