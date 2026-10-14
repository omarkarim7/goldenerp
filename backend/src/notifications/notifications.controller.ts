import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('unread') unread?: string,
    @Query('company') company?: string,
  ) {
    return this.service.findAll(userId, unread === 'true', company);
  }

  @Get('unread-count')
  getUnreadCount(
    @CurrentUser('sub') userId: string,
    @Query('company') company?: string,
  ) {
    return this.service.getUnreadCount(userId, company);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) { return this.service.markAsRead(id); }

  @Patch('read-all')
  markAllRead(
    @CurrentUser('sub') userId: string,
    @Query('company') company?: string,
  ) {
    return this.service.markAllRead(userId, company);
  }
}
