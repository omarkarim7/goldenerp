import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthorizedPersonsService } from './authorized-persons.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('authorized-persons')
@UseGuards(JwtAuthGuard)
export class AuthorizedPersonsController {
  constructor(private readonly service: AuthorizedPersonsService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) { return this.service.findAll(companyId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() data: {
    companyId: string; name: string; title: string;
    nationalId: string; signaturePath?: string;
  }) { return this.service.create(data); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) { return this.service.update(id, data); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.service.delete(id); }
}
