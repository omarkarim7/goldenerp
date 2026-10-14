import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    const where = search
      ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }] }
      : {};

    return this.prisma.supplier.findMany({
      where,
      include: {
        _count: { select: { purchases: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          include: {
            operation: { select: { id: true, name: true } },
            payments: { orderBy: { paymentDate: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!supplier) throw new NotFoundException('المورد غير موجود');
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.supplier.delete({ where: { id } });
  }

  async getBalance(id: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { supplierId: id },
      select: { totalAmount: true, paidAmount: true, remaining: true },
    });
    const totalDue = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + Number(p.paidAmount), 0);
    return { totalDue, totalPaid, remaining: totalDue - totalPaid };
  }
}
