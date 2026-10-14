import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApprovalsService } from './approvals.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole, ApprovalStatus } from '@prisma/client';
import { CreateApprovalDto, UpdateApprovalDto, ApprovalActionDto } from './dto/approval.dto.js';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private readonly service: ApprovalsService) {}

  @Get()
  findAll(
    @Query('status') status?: ApprovalStatus,
    @Query('company') company?: string,
    @Query('requestedBy') requestedBy?: string,
  ) {
    return this.service.findAll({ status, company, requestedBy });
  }

  @Get('pending-count')
  getPendingCount(@Query('company') company?: string) {
    return this.service.getPendingCount(company);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateApprovalDto, @Req() req: any) {
    return this.service.createApproval(dto, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.DEPUTY_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateApprovalDto) {
    return this.service.updateApproval(id, dto);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.DEPUTY_MANAGER)
  approve(@Param('id') id: string, @Req() req: any, @Body() dto: ApprovalActionDto) {
    return this.service.approve(id, req.user, dto?.notes);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GENERAL_MANAGER, UserRole.DEPUTY_MANAGER)
  reject(@Param('id') id: string, @Req() req: any, @Body() dto: ApprovalActionDto) {
    return this.service.reject(id, req.user, dto?.notes);
  }
}
