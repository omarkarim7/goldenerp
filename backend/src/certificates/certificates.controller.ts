import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CertificatesService } from './certificates.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('certificates')
@UseGuards(JwtAuthGuard)
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  @Get()
  findAll(@Query('operationId') operationId?: string) { return this.service.findAll(operationId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() data: {
    operationId: string; companyId: string; certificateNo: number;
    grossAmount: number; taxDeduction?: number; vatAmount?: number;
    performanceBond?: number; netAmount?: number;
    certificateDate?: string; notes?: string;
  }) { return this.service.create(data); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) { return this.service.update(id, data); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.service.delete(id); }
}
