import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { Notification } from '../entities/notification.entity';
import { LoggerService } from '@forex-marketplace/shared-utils';
import { NotificationType } from '@forex-marketplace/shared-types';
import {
  TransactionNotificationEvent,
  OrderNotificationEvent,
  WalletNotificationEvent,
} from '@forex-marketplace/message-queue';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: jest.Mocked<Repository<Notification>>;
  let emailService: jest.Mocked<EmailService>;
  let loggerService: jest.Mocked<LoggerService>;

  const mockNotification = {
    id: 'notification-id',
    userId: 'user-id',
    type: NotificationType.TRANSACTION,
    title: 'Transaction Notification',
    message: 'Your transaction has been processed',
    data: { transactionId: 'transaction-id' },
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn().mockResolvedValue(undefined),
            createTransactionEmailContent: jest.fn().mockReturnValue('<p>Transaction Content</p>'),
            createOrderEmailContent: jest.fn().mockReturnValue('<p>Order Content</p>'),
            createWalletEmailContent: jest.fn().mockReturnValue('<p>Wallet Content</p>'),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get(getRepositoryToken(Notification)) as jest.Mocked<Repository<Notification>>;
    emailService = module.get(EmailService) as jest.Mocked<EmailService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const notificationData = {
        userId: 'user-id',
        type: NotificationType.TRANSACTION,
        title: 'Test Notification',
        message: 'This is a test notification',
        data: { someData: 'value' },
      };

      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      const result = await service.createNotification(notificationData);

      expect(notificationRepository.create).toHaveBeenCalledWith(notificationData);
      expect(notificationRepository.save).toHaveBeenCalledWith(mockNotification);
      expect(result).toEqual(mockNotification);
    });

    it('should handle errors when creating a notification', async () => {
      const notificationData = {
        userId: 'user-id',
        type: NotificationType.TRANSACTION,
        title: 'Test Notification',
        message: 'This is a test notification',
        data: { someData: 'value' },
      };

      // Set up repository mocks to trigger error in service
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockRejectedValue(new Error('Database error'));

      try {
        await service.createNotification(notificationData);
        // If we reach here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBe('Database error');
      }
    });
  });

  describe('getNotificationById', () => {
    it('should return a notification by id', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.getNotificationById('notification-id');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-id' },
      });
      expect(result).toEqual(mockNotification);
    });

    it('should return null when notification is not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      const result = await service.getNotificationById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);
      notificationRepository.save.mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await service.markAsRead('notification-id');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-id' },
      });
      expect(notificationRepository.save).toHaveBeenCalledWith({
        ...mockNotification,
        isRead: true,
      });
      expect(result.isRead).toBe(true);
    });

    it('should throw error if notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('non-existent-id')).rejects.toThrow('Notification not found');
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications for a user', async () => {
      const mockNotifications = [mockNotification];
      notificationRepository.findAndCount.mockResolvedValue([mockNotifications, 1]);

      const result = await service.getUserNotifications('user-id');

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result.items).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should return empty list when user has no notifications', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getUserNotifications('user-id');

      expect(result.items).toHaveLength(0);
      expect(result.total).toEqual(0);
    });
  });

  describe('handleTransactionNotification', () => {
    it('should process transaction notification and send email', async () => {
      const transactionEvent = new TransactionNotificationEvent(
        'user-id',
        'transaction-id',
        1000,
        'USD',
        'CREDIT',
        'user@example.com'
      );

      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      await service.handleTransactionNotification(transactionEvent);

      expect(notificationRepository.create).toHaveBeenCalled();
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(emailService.createTransactionEmailContent).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('should handle errors during transaction notification processing', async () => {
      const transactionEvent = new TransactionNotificationEvent(
        'user-id',
        'transaction-id',
        1000,
        'USD',
        'CREDIT',
        'user@example.com'
      );

      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockRejectedValue(new Error('Database error'));

      await service.handleTransactionNotification(transactionEvent);

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('handleOrderNotification', () => {
    it('should process order notification and send email', async () => {
      const orderEvent = new OrderNotificationEvent(
        'user-id',
        'order-id',
        'COMPLETED',
        'BUY',
        'USD',
        'EUR',
        'user@example.com'
      );

      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      await service.handleOrderNotification(orderEvent);

      expect(notificationRepository.create).toHaveBeenCalled();
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(emailService.createOrderEmailContent).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('should handle errors during order notification processing', async () => {
      const orderEvent = new OrderNotificationEvent(
        'user-id',
        'order-id',
        'COMPLETED',
        'BUY',
        'USD',
        'EUR',
        'user@example.com'
      );

      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockRejectedValue(new Error('Database error'));

      await service.handleOrderNotification(orderEvent);

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('handleWalletNotification', () => {
    it('should process wallet notification and send email', async () => {
      const walletEvent = new WalletNotificationEvent(
        'user-id',
        'wallet-id',
        'USD',
        'CREATED',
        'user@example.com'
      );

      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      await service.handleWalletNotification(walletEvent);

      expect(notificationRepository.create).toHaveBeenCalled();
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(emailService.createWalletEmailContent).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('should handle errors during wallet notification processing', async () => {
      const walletEvent = new WalletNotificationEvent(
        'user-id',
        'wallet-id',
        'USD',
        'CREATED',
        'user@example.com'
      );

      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockRejectedValue(new Error('Database error'));

      await service.handleWalletNotification(walletEvent);

      expect(loggerService.error).toHaveBeenCalled();
    });
  });
}); 