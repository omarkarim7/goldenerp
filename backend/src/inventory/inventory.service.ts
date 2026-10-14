import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { StockMovementDto } from './dto/stock-movement.dto.js';
import { MovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllProducts(search?: string, category?: string) {
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: { _count: { select: { movements: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOneProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        movements: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!product) throw new NotFoundException('المنتج غير موجود');
    return product;
  }

  async createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.findOneProduct(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async addMovement(dto: StockMovementDto) {
    const product = await this.findOneProduct(dto.productId);

    if (dto.type === 'OUT' || dto.type === 'SALE') {
      if (Number(product.currentStock) < dto.quantity) {
        throw new BadRequestException(
          `الكمية المتاحة (${product.currentStock}) أقل من المطلوب (${dto.quantity})`
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          type: dto.type,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          totalPrice: dto.unitPrice ? dto.quantity * dto.unitPrice : undefined,
          reference: dto.reference,
          operationId: dto.operationId,
          notes: dto.notes,
        },
      });

      const stockChange = dto.type === 'IN' ? dto.quantity : -dto.quantity;

      await tx.product.update({
        where: { id: dto.productId },
        data: { currentStock: { increment: stockChange } },
      });

      return movement;
    });
  }

  async getMovements(productId?: string, type?: MovementType) {
    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;
    if (type) where.type = type;

    return this.prisma.stockMovement.findMany({
      where,
      include: { product: { select: { id: true, name: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getLowStock() {
    return this.prisma.$queryRaw`
      SELECT id, name, unit, "currentStock", "minStock"
      FROM products
      WHERE "currentStock" <= "minStock" AND "minStock" > 0
      ORDER BY "currentStock" ASC
    `;
  }

  async getCategories() {
    const products = await this.prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { category: { not: null } },
    });
    return products.map((p) => p.category).filter(Boolean);
  }
}
