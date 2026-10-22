import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { CreateAdvanceDto } from './dto/create-advance.dto.js';
import { CreateVisitDto } from './dto/create-visit.dto.js';
import { UpdateVisitDto } from './dto/update-visit.dto.js';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    const where = search ? { name: { contains: search } } : {};
    return this.prisma.employee.findMany({
      where,
      include: {
        _count: { select: { advances: true, visits: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        advances: { orderBy: { advanceDate: 'desc' } },
        visits: { orderBy: { visitDate: 'desc' }, take: 20 },
      },
    });
    if (!employee) throw new NotFoundException('الموظف غير موجود');
    return employee;
  }

  async create(dto: CreateEmployeeDto) {
    return this.prisma.employee.create({ data: dto });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data: dto });
  }

  // --- Advances (السلف) ---
  async addAdvance(employeeId: string, dto: CreateAdvanceDto) {
    return this.prisma.employeeAdvance.create({
      data: {
        employeeId,
        amount: dto.amount,
        remaining: dto.amount,
        reason: dto.reason,
        advanceDate: new Date(dto.advanceDate),
        notes: dto.notes,
      },
    });
  }

  async getAdvances(employeeId?: string) {
    const where = employeeId ? { employeeId } : {};
    return this.prisma.employeeAdvance.findMany({
      where,
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { advanceDate: 'desc' },
    });
  }

  // --- Visits (الزيارات) ---
  async addVisit(dto: CreateVisitDto) {
    return this.prisma.visit.create({
      data: {
        employeeId: dto.employeeId,
        operationId: dto.operationId || null,
        visitDate: new Date(dto.visitDate),
        location: dto.location,
        purpose: dto.purpose,
        expenses: dto.expenses || 0,
        notes: dto.notes,
      },
    });
  }

  async getVisits(filters?: { employeeId?: string; operationId?: string; company?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.operationId) where.operationId = filters.operationId;
    if (filters?.company && filters.company !== 'ALL') {
      where.OR = [
        { operationId: { startsWith: filters.company } },
        { notes: { contains: `company:${filters.company}` } },
      ];
    }

    return this.prisma.visit.findMany({
      where,
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { visitDate: 'desc' },
    });
  }

  async updateVisit(id: string, dto: UpdateVisitDto) {
    const visit = await this.prisma.visit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('المعاينة / الزيارة غير موجودة');

    const data: Record<string, any> = {};
    if (dto.employeeId !== undefined) data.employeeId = dto.employeeId;
    if (dto.operationId !== undefined) data.operationId = dto.operationId || null;
    if (dto.visitDate !== undefined) data.visitDate = new Date(dto.visitDate);
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.purpose !== undefined) data.purpose = dto.purpose;
    if (dto.expenses !== undefined) data.expenses = dto.expenses;
    if (dto.isPaid !== undefined) data.isPaid = dto.isPaid;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.visit.update({
      where: { id },
      data,
      include: { employee: { select: { id: true, name: true } } },
    });
  }

  async deleteVisit(id: string) {
    const visit = await this.prisma.visit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('المعاينة / الزيارة غير موجودة');

    return this.prisma.visit.delete({ where: { id } });
  }
}
