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

  async getOperationsOverview() {
    const operations = await this.prisma.operation.findMany({
      include: {
        companies: {
          include: {
            company: { select: { id: true, name: true, code: true } },
          },
        },
        operationFinance: true,
        certificates: {
          select: {
            id: true,
            certificateNo: true,
            grossAmount: true,
            taxDeduction: true,
            vatAmount: true,
            performanceBond: true,
            netAmount: true,
            certificateDate: true,
          },
        },
        guarantees: {
          select: {
            id: true,
            guaranteeNumber: true,
            bank: true,
            amount: true,
            type: true,
            status: true,
            validUntil: true,
          },
        },
        purchases: {
          select: {
            id: true,
            totalAmount: true,
            paidAmount: true,
            remaining: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return operations;
  }
}
