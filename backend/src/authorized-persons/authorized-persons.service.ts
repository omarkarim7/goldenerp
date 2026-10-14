import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthorizedPersonsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = companyId;
    return this.prisma.authorizedPerson.findMany({
      where,
      include: { company: { select: { id: true, name: true, code: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const person = await this.prisma.authorizedPerson.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!person) throw new NotFoundException('المفوض غير موجود');
    return person;
  }

  async create(data: {
    companyId: string; name: string; title: string;
    nationalId: string; signaturePath?: string;
  }) {
    return this.prisma.authorizedPerson.create({
      data,
      include: { company: { select: { id: true, name: true, code: true } } },
    });
  }

  async update(id: string, data: Partial<{
    name: string; title: string; nationalId: string;
    signaturePath: string; isActive: boolean;
  }>) {
    await this.findOne(id);
    return this.prisma.authorizedPerson.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.authorizedPerson.delete({ where: { id } });
  }
}
