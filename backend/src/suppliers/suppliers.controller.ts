import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  findAll(@Query('search') search?: string) { return this.service.findAll(search); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Get(':id/balance')
  getBalance(@Param('id') id: string) { return this.service.getBalance(id); }

  @Post()
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  create(@Body() dto: CreateSupplierDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  delete(@Param('id') id: string) { return this.service.delete(id); }
}
