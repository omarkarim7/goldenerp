import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PreviousWorksService } from './previous-works.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PrevWorkDocType, UserRole } from '@prisma/client';

@Controller('previous-works')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PreviousWorksController {
  constructor(private readonly service: PreviousWorksService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) { return this.service.findAll(companyId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  create(@Body() data: {
    companyId: string; category: string; title: string;
    authority?: string; year?: number; docType: PrevWorkDocType;
    fileName: string; filePath: string; fileSize?: number; uploadedBy?: string;
  }) { return this.service.create(data); }

  @Patch(':id')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  update(@Param('id') id: string, @Body() data: any) { return this.service.update(id, data); }

  @Delete(':id')
  @Roles(UserRole.GENERAL_MANAGER)
  delete(@Param('id') id: string) { return this.service.delete(id); }
}
