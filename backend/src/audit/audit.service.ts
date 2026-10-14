import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: {
    userId?: string; entityType?: string; entityId?: string;
    action?: string; from?: string; to?: string;
    page?: number; limit?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.action) where.action = filters.action;
    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as Record<string, Date>).gte = new Date(filters.from);
      if (filters.to) (where.createdAt as Record<string, Date>).lte = new Date(filters.to);
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async log(data: {
    userId: string; action: string; entityType: string;
    entityId?: string; details?: string; ipAddress?: string; userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }
}
