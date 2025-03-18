import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { NotificationService } from '../services/notification.service';
import { NotificationPattern } from '@forex-marketplace/message-queue';
import { LoggerService } from '@forex-marketplace/shared-utils';

@Controller()
export class NotificationConsumers {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService
  ) {}

  @EventPattern(NotificationPattern.SEND_TRANSACTION_NOTIFICATION)
  async handleTransactionNotification(data: any) {
    try {
      this.logger.log(
        `Received transaction notification event: ${JSON.stringify(data)}`
      );
      await this.notificationService.handleTransactionNotification(data);
    } catch (error) {
      this.logger.error(
        `Error in transaction notification consumer: ${error.message}`,
        error.stack
      );
    }
  }

  @EventPattern(NotificationPattern.SEND_ORDER_NOTIFICATION)
  async handleOrderNotification(data: any) {
    try {
      this.logger.log(
        `Received order notification event: ${JSON.stringify(data)}`
      );
      await this.notificationService.handleOrderNotification(data);
    } catch (error) {
      this.logger.error(
        `Error in order notification consumer: ${error.message}`,
        error.stack
      );
    }
  }

  @EventPattern(NotificationPattern.SEND_WALLET_NOTIFICATION)
  async handleWalletNotification(data: any) {
    try {
      this.logger.log(
        `Received wallet notification event: ${JSON.stringify(data)}`
      );
      await this.notificationService.handleWalletNotification(data);
    } catch (error) {
      this.logger.error(
        `Error in wallet notification consumer: ${error.message}`,
        error.stack
      );
    }
  }
}
