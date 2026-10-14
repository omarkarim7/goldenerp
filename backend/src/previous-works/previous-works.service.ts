import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrevWorkDocType } from '@prisma/client';

@Injectable()
export class PreviousWorksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    const where = companyId ? { companyId } : {};
    return this.prisma.previousWork.findMany({
      where,
      include: { company: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const work = await this.prisma.previousWork.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!work) throw new NotFoundException('سابقة الأعمال غير موجودة');
    return work;
  }

  async create(data: {
    companyId: string; category: string; title: string;
    authority?: string; year?: number; docType: PrevWorkDocType;
    fileName: string; filePath: string; fileSize?: number; uploadedBy?: string;
  }) {
    return this.prisma.previousWork.create({
      data,
      include: { company: { select: { id: true, name: true, code: true } } },
    });
  }

  async update(id: string, data: Partial<{
    category: string; title: string; authority: string;
    year: number; docType: PrevWorkDocType;
  }>) {
    await this.findOne(id);
    return this.prisma.previousWork.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.previousWork.delete({ where: { id } });
  }
}
