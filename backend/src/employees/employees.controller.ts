import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { CreateAdvanceDto } from './dto/create-advance.dto.js';
import { CreateVisitDto } from './dto/create-visit.dto.js';
import { UpdateVisitDto } from './dto/update-visit.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  findAll(@Query('search') search?: string) { return this.service.findAll(search); }

  @Get('advances')
  getAdvances(@Query('employeeId') employeeId?: string) {
    return this.service.getAdvances(employeeId);
  }

  @Get('visits')
  getVisits(
    @Query('employeeId') employeeId?: string,
    @Query('operationId') operationId?: string,
    @Query('company') company?: string,
  ) { return this.service.getVisits({ employeeId, operationId, company }); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles(UserRole.GENERAL_MANAGER)
  create(@Body() dto: CreateEmployeeDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles(UserRole.GENERAL_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/advances')
  @Roles(UserRole.GENERAL_MANAGER)
  addAdvance(@Param('id') id: string, @Body() dto: CreateAdvanceDto) {
    return this.service.addAdvance(id, dto);
  }

  @Post('visits')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  addVisit(@Body() dto: CreateVisitDto) { return this.service.addVisit(dto); }

  @Patch('visits/:id')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  updateVisit(@Param('id') id: string, @Body() dto: UpdateVisitDto) {
    return this.service.updateVisit(id, dto);
  }

  @Delete('visits/:id')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.EMPLOYEE)
  deleteVisit(@Param('id') id: string) {
    return this.service.deleteVisit(id);
  }
}
