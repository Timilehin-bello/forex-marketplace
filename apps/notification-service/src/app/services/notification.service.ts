import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { EmailService } from './email.service';
import { LoggerService } from '@forex-marketplace/shared-utils';
import { NotificationType } from '@forex-marketplace/shared-types';
import {
  TransactionNotificationEvent,
  OrderNotificationEvent,
  WalletNotificationEvent,
} from '@forex-marketplace/message-queue';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly emailService: EmailService,
    private readonly logger: LoggerService
  ) {}

  async createNotification(data: Partial<Notification>): Promise<Notification> {
    const notification = this.notificationRepository.create(data);
    return this.notificationRepository.save(notification);
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });
    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async handleTransactionNotification(
    data: TransactionNotificationEvent
  ): Promise<void> {
    try {
      this.logger.log(
        `Processing transaction notification for user ${data.userId}`
      );

      // Create notification in database
      await this.createNotification({
        userId: data.userId,
        type: NotificationType.TRANSACTION,
        title: `${data.type} Transaction`,
        message: `You have ${data.type === 'CREDIT' ? 'received' : 'sent'} ${
          data.amount
        } ${data.currency}`,
        metadata: data.metadata,
      });

      // Send email if email address is provided
      if (data.email) {
        const emailContent = this.emailService.createTransactionEmailContent(
          data.type,
          data.amount,
          data.currency
        );

        await this.emailService.sendEmail(
          data.email,
          `${data.type} Transaction Notification`,
          emailContent
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling transaction notification: ${error.message}`,
        error.stack
      );
    }
  }

  async handleOrderNotification(data: OrderNotificationEvent): Promise<void> {
    try {
      this.logger.log(`Processing order notification for user ${data.userId}`);

      // Create notification in database
      await this.createNotification({
        userId: data.userId,
        type: NotificationType.ORDER,
        title: `Order ${data.status}`,
        message: `Your ${data.type} order from ${data.fromCurrency} to ${
          data.toCurrency
        } has been ${data.status.toLowerCase()}`,
        metadata: data.metadata,
      });

      // Send email if email address is provided
      if (data.email) {
        const emailContent = this.emailService.createOrderEmailContent(
          data.type,
          data.status,
          data.fromCurrency,
          data.toCurrency,
          data.metadata?.fromAmount ? Number(data.metadata.fromAmount) : 0,
          data.metadata?.toAmount ? Number(data.metadata.toAmount) : 0
        );

        await this.emailService.sendEmail(
          data.email,
          `Order ${data.status} Notification`,
          emailContent
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling order notification: ${error.message}`,
        error.stack
      );
    }
  }

  async handleWalletNotification(data: WalletNotificationEvent): Promise<void> {
    try {
      this.logger.log(`Processing wallet notification for user ${data.userId}`);

      // Create notification in database
      await this.createNotification({
        userId: data.userId,
        type: NotificationType.WALLET,
        title: `Wallet ${data.action}`,
        message: `Your ${
          data.currency
        } wallet has been ${data.action.toLowerCase()}`,
        metadata: data.metadata,
      });

      // Send email if email address is provided
      if (data.email) {
        const emailContent = this.emailService.createWalletEmailContent(
          data.currency,
          data.action
        );

        await this.emailService.sendEmail(
          data.email,
          `Wallet ${data.action} Notification`,
          emailContent
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling wallet notification: ${error.message}`,
        error.stack
      );
    }
  }
}
