import {
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import {
  JwtAuthGuard,
  CurrentUser,
  AuthorizationService,
} from '@forex-marketplace/auth';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly authService: AuthorizationService
  ) {}

  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId') userId: string,
    @CurrentUser() user,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    // Only allow users to access their own notifications unless they're an admin
    this.authService.ensureOwnerOrAdmin(
      userId,
      user,
      'You are not authorized to access notifications for this user'
    );

    return this.notificationService.getUserNotifications(
      userId,
      page ? parseInt(String(page)) : 1,
      limit ? parseInt(String(limit)) : 10
    );
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser() user) {
    // First find the notification to check ownership
    const notification = await this.notificationService.getNotificationById(id);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Verify the notification belongs to the current user
    this.authService.ensureOwnerOrAdmin(
      notification.userId,
      user,
      'You are not authorized to mark this notification as read'
    );

    return this.notificationService.markAsRead(id);
  }
}
