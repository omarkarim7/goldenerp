import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { OperationContactsService } from './operation-contacts.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('operations/:operationId/contacts')
@UseGuards(JwtAuthGuard)
export class OperationContactsController {
  constructor(private readonly service: OperationContactsService) {}

  @Get()
  findAll(@Param('operationId') operationId: string) { return this.service.findAll(operationId); }

  @Post()
  create(@Param('operationId') operationId: string, @Body() data: {
    name: string; title?: string; phone?: string; email?: string; notes?: string;
  }) { return this.service.create({ ...data, operationId }); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) { return this.service.update(id, data); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.service.delete(id); }
}
