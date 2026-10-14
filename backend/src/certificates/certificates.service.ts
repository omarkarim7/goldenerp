import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(operationId?: string) {
    const where = operationId ? { operationId } : {};
    return this.prisma.certificate.findMany({
      where,
      include: {
        operation: { select: { id: true, name: true, authority: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id },
      include: { operation: true },
    });
    if (!cert) throw new NotFoundException('الشهادة غير موجودة');
    return cert;
  }

  async create(data: {
    operationId: string; companyId: string; certificateNo: number;
    grossAmount: number; taxDeduction?: number; vatAmount?: number;
    performanceBond?: number; netAmount?: number;
    certificateDate?: string; notes?: string;
  }) {
    return this.prisma.certificate.create({
      data: {
        operationId: data.operationId,
        companyId: data.companyId,
        certificateNo: data.certificateNo,
        grossAmount: data.grossAmount,
        taxDeduction: data.taxDeduction,
        vatAmount: data.vatAmount,
        performanceBond: data.performanceBond,
        netAmount: data.netAmount,
        certificateDate: data.certificateDate ? new Date(data.certificateDate) : undefined,
        notes: data.notes,
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.certificate.update({
      where: { id },
      data: {
        ...data,
        certificateDate: data.certificateDate ? new Date(data.certificateDate) : undefined,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.certificate.delete({ where: { id } });
  }
}
