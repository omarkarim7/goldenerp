import { Controller, Get, Patch, Query, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GENERAL_MANAGER, UserRole.DEPUTY_MANAGER)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  findAll(@Query('group') group?: string) {
    return this.service.findAll(group);
  }

  @Patch()
  updateMany(@Body() settings: { key: string; value: string; label?: string; group?: string; type?: string }[]) {
    return this.service.updateMany(settings);
  }
}
