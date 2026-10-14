import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PurchasesService } from './purchases.service.js';
import { CreatePurchaseDto } from './dto/create-purchase.dto.js';
import { AddPaymentDto } from './dto/add-payment.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Get()
  findAll(
    @Query('supplierId') supplierId?: string,
    @Query('operationId') operationId?: string,
    @Query('status') status?: string,
  ) { return this.service.findAll({ supplierId, operationId, status }); }

  @Get('stats')
  getStats() { return this.service.getStats(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreatePurchaseDto) { return this.service.create(dto); }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() dto: AddPaymentDto) {
    return this.service.addPayment(id, dto);
  }
}
