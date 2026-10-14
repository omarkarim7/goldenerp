import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { createHash } from 'crypto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { operationId?: string; companyId?: string; type?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.operationId) where.operationId = filters.operationId;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.type) where.type = filters.type;

    return this.prisma.document.findMany({
      where,
      include: {
        _count: { select: { versions: true, prints: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { version: 'desc' } },
        prints: { orderBy: { printedAt: 'desc' } },
      },
    });
    if (!doc) throw new NotFoundException('المستند غير موجود');
    return doc;
  }

  async create(data: {
    operationId?: string; companyId?: string; type: string; title: string;
    fileName: string; filePath: string; fileSize?: number; uploadedBy?: string;
  }) {
    const hashCode = createHash('md5')
      .update(`${data.fileName}-${Date.now()}`)
      .digest('hex');

    return this.prisma.document.create({
      data: { ...data, hashCode },
    });
  }

  async addVersion(documentId: string, data: {
    filePath: string; changedBy?: string; changeNotes?: string;
  }) {
    const doc = await this.findOne(documentId);
    const nextVersion = doc.versions.length + 1;

    return this.prisma.documentVersion.create({
      data: {
        documentId,
        version: nextVersion,
        filePath: data.filePath,
        changedBy: data.changedBy,
        changeNotes: data.changeNotes,
      },
    });
  }

  async logPrint(documentId: string, data: {
    printedBy: string; copies?: number; screenshotPath?: string; pdfCopyPath?: string;
  }) {
    return this.prisma.documentPrint.create({
      data: {
        documentId,
        printedBy: data.printedBy,
        copies: data.copies || 1,
        screenshotPath: data.screenshotPath,
        pdfCopyPath: data.pdfCopyPath,
      },
    });
  }

  async approvePrint(printId: string, approvedBy: string) {
    return this.prisma.documentPrint.update({
      where: { id: printId },
      data: { approved: true, approvedBy, approvedAt: new Date() },
    });
  }

  async findByHash(hashCode: string) {
    const doc = await this.prisma.document.findUnique({
      where: { hashCode },
      include: { prints: true, versions: true },
    });
    if (!doc) throw new NotFoundException('المستند غير موجود بهذا الكود');
    return doc;
  }
}
