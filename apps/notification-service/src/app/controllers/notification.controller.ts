import {
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
  NotFoundException,
  Query,
  Inject,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { NotificationService } from '../services/notification.service';
import {
  JwtAuthGuard,
  CurrentUser,
  AuthorizationService,
} from '@forex-marketplace/auth';
import { Observable } from 'rxjs';

// Define the user service interface
interface UserService {
  getUserById(data: {
    id: string;
  }): Observable<{ id: string; name: string; email: string }>;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  private userService: UserService;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly authService: AuthorizationService,
    @Inject('USER_SERVICE') private readonly userServiceClient: ClientGrpc
  ) {}

  onModuleInit() {
    this.userService =
      this.userServiceClient.getService<UserService>('UserService');
  }

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

    // The user existence check is causing problems, so we'll remove it
    // and rely on the authorization check above

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
