import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class OperationContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(operationId: string) {
    return this.prisma.operationContact.findMany({
      where: { operationId },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: {
    operationId: string; name: string; title?: string;
    phone?: string; email?: string; notes?: string;
  }) {
    return this.prisma.operationContact.create({ data });
  }

  async update(id: string, data: any) {
    const contact = await this.prisma.operationContact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('جهة الاتصال غير موجودة');
    return this.prisma.operationContact.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.operationContact.delete({ where: { id } });
  }
}
