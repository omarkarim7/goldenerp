import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.GENERAL_MANAGER)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('permissions/all')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.DEPUTY_MANAGER)
  getAllPermissions() {
    return this.usersService.getAllPermissions();
  }

  @Get(':id')
  @Roles(UserRole.GENERAL_MANAGER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.GENERAL_MANAGER)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.GENERAL_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/unlock')
  @Roles(UserRole.GENERAL_MANAGER)
  unlock(@Param('id') id: string) {
    return this.usersService.unlock(id);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.GENERAL_MANAGER)
  toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }

  @Delete(':id')
  @Roles(UserRole.GENERAL_MANAGER)
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  // =========================================================================
  // نظام الصلاحيات المتقدم والتخصيص
  // =========================================================================

  @Get(':id/permissions')
  @Roles(UserRole.GENERAL_MANAGER, UserRole.DEPUTY_MANAGER)
  getUserPermissions(@Param('id') id: string) {
    return this.usersService.getUserPermissions(id);
  }

  @Post(':id/permissions')
  @Roles(UserRole.GENERAL_MANAGER)
  updateUserPermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
  ) {
    return this.usersService.updateUserPermissions(id, permissions || []);
  }
}
