import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  findAll(
    @Query('operationId') operationId?: string,
    @Query('companyId') companyId?: string,
    @Query('type') type?: string,
  ) { return this.service.findAll({ operationId, companyId, type }); }

  @Get('hash/:hashCode')
  findByHash(@Param('hashCode') hashCode: string) { return this.service.findByHash(hashCode); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() data: {
    operationId?: string; companyId?: string; type: string; title: string;
    fileName: string; filePath: string; fileSize?: number; uploadedBy?: string;
  }) { return this.service.create(data); }

  @Post(':id/versions')
  addVersion(@Param('id') id: string, @Body() data: {
    filePath: string; changedBy?: string; changeNotes?: string;
  }) { return this.service.addVersion(id, data); }

  @Post(':id/prints')
  logPrint(@Param('id') id: string, @Body() data: {
    printedBy: string; copies?: number; screenshotPath?: string; pdfCopyPath?: string;
  }) { return this.service.logPrint(id, data); }

  @Patch('prints/:printId/approve')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.DEPUTY_MANAGER)
  approvePrint(@Param('printId') printId: string, @Body('approvedBy') approvedBy: string) {
    return this.service.approvePrint(printId, approvedBy);
  }
}
