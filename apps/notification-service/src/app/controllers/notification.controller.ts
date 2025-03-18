import { Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { JwtAuthGuard } from '@forex-marketplace/auth';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('user/:userId')
  async getUserNotifications(@Param('userId') userId: string) {
    return this.notificationService.getUserNotifications(userId);
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }
}
