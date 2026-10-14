import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { GuaranteesService } from './guarantees.service.js';
import { CreateGuaranteeDto } from './dto/create-guarantee.dto.js';
import { UpdateGuaranteeDto } from './dto/update-guarantee.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { GuaranteeStatus, UserRole } from '@prisma/client';

@Controller('guarantees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuaranteesController {
  constructor(private readonly service: GuaranteesService) {}

  @Get()
  findAll(
    @Query('operationId') operationId?: string,
    @Query('status') status?: GuaranteeStatus,
    @Query('type') type?: string,
  ) {
    return this.service.findAll({ operationId, status, type });
  }

  @Get('stats')
  getStats() { return this.service.getStats(); }

  @Get('expiring')
  getExpiring(@Query('days') days?: number) {
    return this.service.getExpiring(days || 30);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  create(@Body() dto: CreateGuaranteeDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  update(@Param('id') id: string, @Body() dto: UpdateGuaranteeDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/request-recovery')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  requestRecovery(@Param('id') id: string, @Body() data: {
    recoveryLetterDate?: string; recoveryLetterPath?: string;
    paymentOrderDate?: string; paymentOrderPath?: string;
  }) {
    return this.service.requestRecovery(id, data);
  }

  @Patch(':id/mark-recovered')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  markRecovered(@Param('id') id: string, @Body() data: {
    actualRecoveryDate: string; deliveredTo?: string; deliveryReceiptPath?: string;
  }) {
    return this.service.markRecovered(id, data);
  }
}
