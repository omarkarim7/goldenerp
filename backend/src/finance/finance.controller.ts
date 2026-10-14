import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GENERAL_MANAGER)
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get()
  findAll(@Query('operationId') operationId?: string) { return this.service.findAll(operationId); }

  @Get('summary')
  getSummary() { return this.service.getSummary(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() data: {
    operationId: string; totalCost?: number; totalRevenue?: number;
    netProfit?: number; notes?: string;
  }) { return this.service.create(data); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) { return this.service.update(id, data); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.service.delete(id); }
}
