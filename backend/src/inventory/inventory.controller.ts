import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { StockMovementDto } from './dto/stock-movement.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { MovementType, UserRole } from '@prisma/client';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('products')
  findAllProducts(@Query('search') search?: string, @Query('category') category?: string) {
    return this.service.findAllProducts(search, category);
  }

  @Get('products/low-stock')
  getLowStock() { return this.service.getLowStock(); }

  @Get('categories')
  getCategories() { return this.service.getCategories(); }

  @Get('movements')
  getMovements(@Query('productId') productId?: string, @Query('type') type?: MovementType) {
    return this.service.getMovements(productId, type);
  }

  @Get('products/:id')
  findOneProduct(@Param('id') id: string) { return this.service.findOneProduct(id); }

  @Post('products')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  createProduct(@Body() dto: CreateProductDto) { return this.service.createProduct(dto); }

  @Patch('products/:id')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(id, dto);
  }

  @Post('movements')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addMovement(@Body() dto: StockMovementDto) { return this.service.addMovement(dto); }
}
