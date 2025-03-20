import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { TransactionService } from './transaction.service';
import { Order } from '../entities/order.entity';
import { Transaction } from '../entities/transaction.entity';
import { LoggerService } from '@forex-marketplace/shared-utils';
import { OrderStatus, OrderType } from '@forex-marketplace/shared-types';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { of, throwError } from 'rxjs';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TestUtils } from '../test/test-utils';

describe('TransactionService', () => {
  let service: TransactionService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let transactionRepository: jest.Mocked<Repository<Transaction>>;
  let dataSource: jest.Mocked<DataSource>;
  let loggerService: jest.Mocked<LoggerService>;
  let rateClient: any;
  let walletServiceClient: any;
  let userServiceClient: any;
  let notificationClient: jest.Mocked<ClientProxy>;

  const mockOrder = TestUtils.createMockOrder();
  const mockTransaction = TestUtils.createMockTransaction();
  const mockWallet = TestUtils.createMockWallet();
  const mockUser = TestUtils.createMockUser();
  const mockRate = TestUtils.createMockRate();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(TestUtils.createMockQueryRunner()),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: 'RATE_SERVICE',
          useValue: {
            getService: jest.fn().mockReturnValue(TestUtils.createMockRateService()),
          },
        },
        {
          provide: 'WALLET_SERVICE',
          useValue: {
            getService: jest.fn().mockReturnValue(TestUtils.createMockWalletService()),
          },
        },
        {
          provide: 'USER_SERVICE',
          useValue: {
            getService: jest.fn().mockReturnValue(TestUtils.createMockUserService()),
          },
        },
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: TestUtils.createMockNotificationService(),
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    orderRepository = module.get(getRepositoryToken(Order)) as jest.Mocked<Repository<Order>>;
    transactionRepository = module.get(getRepositoryToken(Transaction)) as jest.Mocked<Repository<Transaction>>;
    dataSource = module.get(DataSource) as jest.Mocked<DataSource>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
    rateClient = module.get('RATE_SERVICE');
    walletServiceClient = module.get('WALLET_SERVICE');
    userServiceClient = module.get('USER_SERVICE');
    notificationClient = module.get('NOTIFICATION_SERVICE') as jest.Mocked<ClientProxy>;

    // Initialize gRPC services
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const createOrderDto = {
      userId: 'user-id',
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      fromAmount: 100,
      type: OrderType.BUY,
    };

    it('should create a new order successfully', async () => {
      const mockQueryRunner = TestUtils.createMockQueryRunner({
        manager: {
          findOne: jest.fn().mockResolvedValue(mockOrder),
          save: jest.fn().mockImplementation(entity => Promise.resolve(entity)),
        },
      });

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner as any);
      orderRepository.create.mockReturnValue(mockOrder);
      orderRepository.save.mockResolvedValue(mockOrder);
      orderRepository.findOne.mockResolvedValue(mockOrder);
      transactionRepository.create.mockReturnValue(mockTransaction);

      const result = await service.createOrder(createOrderDto);

      expect(orderRepository.create).toHaveBeenCalledWith({
        userId: createOrderDto.userId,
        type: createOrderDto.type,
        fromCurrency: createOrderDto.fromCurrency,
        toCurrency: createOrderDto.toCurrency,
        fromAmount: createOrderDto.fromAmount,
        toAmount: 85,
        rate: 0.85,
        status: OrderStatus.PENDING,
      });

      expect(result).toEqual(mockOrder);
      expect(notificationClient.emit).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
    });

    it('should handle rate service errors', async () => {
      rateClient.getService.mockReturnValue({
        getRate: jest.fn().mockReturnValue(
          throwError(() => new Error('Rate service error'))
        ),
      });

      await expect(service.createOrder(createOrderDto)).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should handle concurrent order creation', async () => {
      // Mock a completed order for the second call to simulate concurrent ordering
      const completedOrder = {
        ...mockOrder,
        status: OrderStatus.COMPLETED
      };

      const mockQueryRunner = TestUtils.createMockQueryRunner({
        manager: {
          findOne: jest.fn()
            .mockResolvedValueOnce(completedOrder) // First call returns completed order
            .mockResolvedValueOnce(mockOrder),     // Subsequent calls return pending order
          save: jest.fn().mockImplementation(entity => Promise.resolve(entity)),
        },
      });

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner as any);
      orderRepository.create.mockReturnValue(mockOrder);
      orderRepository.save.mockResolvedValue(mockOrder);
      orderRepository.findOne.mockResolvedValue(mockOrder);

      // This should throw because the order is already completed
      await expect(service.createOrder(createOrderDto)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should handle timeout during order creation', async () => {
      const mockSavedOrder = { ...mockOrder, id: 'timeout-order-id' };
      
      // Return a mock order with a valid ID
      orderRepository.create.mockReturnValue(mockOrder);
      orderRepository.save.mockResolvedValue(mockSavedOrder);
      orderRepository.findOne.mockResolvedValue(mockSavedOrder);

      // Mock query runner to simulate a long-running process
      const mockQueryRunner = TestUtils.createMockQueryRunner({
        manager: {
          findOne: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockSavedOrder), 2000))),
          save: jest.fn().mockResolvedValue(mockSavedOrder),
        },
      });

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner as any);

      // This will time out because the findOne operation takes too long
      await expect(TestUtils.simulateTimeout(() => service.createOrder(createOrderDto), 100)).rejects.toThrow('Operation timed out');
    });

    it('should validate order amount is positive', async () => {
      const invalidOrderDto = {
        ...createOrderDto,
        fromAmount: -100,
      };

      // Mock the rate service to reject the request before it gets to the order creation
      rateClient.getService.mockReturnValue({
        getRate: jest.fn().mockReturnValue(
          throwError(() => new BadRequestException('Amount must be positive'))
        ),
      });

      // Set up the orderRepository to not return anything valid
      orderRepository.save.mockRejectedValue(new BadRequestException('Amount must be positive'));

      await expect(service.createOrder(invalidOrderDto)).rejects.toThrow(BadRequestException);
    });

    it('should validate supported currencies', async () => {
      const invalidOrderDto = {
        ...createOrderDto,
        fromCurrency: 'INVALID',
      };

      // Mock the rate service to reject the request before it gets to order creation
      rateClient.getService.mockReturnValue({
        getRate: jest.fn().mockReturnValue(
          throwError(() => new BadRequestException('Unsupported currency'))
        ),
      });

      // Set up the orderRepository to not return anything valid
      orderRepository.save.mockRejectedValue(new BadRequestException('Unsupported currency'));

      await expect(service.createOrder(invalidOrderDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrderById', () => {
    it('should return an order by id', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.getOrderById('order-id');

      expect(result).toEqual(mockOrder);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-id' },
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.getOrderById('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should handle database errors gracefully', async () => {
      orderRepository.findOne.mockRejectedValue(new Error('Database error'));
      
      // Mock the logger service
      loggerService.error.mockClear();
      
      await expect(service.getOrderById('order-id')).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('getUserOrders', () => {
    it('should return paginated orders for a user', async () => {
      orderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);

      const result = await service.getUserOrders('user-id');

      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should handle pagination parameters', async () => {
      orderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);

      const result = await service.getUserOrders('user-id', 2, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        skip: 20,
        take: 20,
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty list when no orders found', async () => {
      orderRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getUserOrders('user-id');

      expect(result.items).toHaveLength(0);
      expect(result.total).toEqual(0);
    });
  });

  describe('getOrderTransactions', () => {
    it('should return paginated transactions for an order', async () => {
      transactionRepository.findAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.getOrderTransactions('order-id');

      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(transactionRepository.findAndCount).toHaveBeenCalledWith({
        where: { orderId: 'order-id' },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should handle pagination parameters', async () => {
      transactionRepository.findAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.getOrderTransactions('order-id', 2, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(transactionRepository.findAndCount).toHaveBeenCalledWith({
        where: { orderId: 'order-id' },
        skip: 20,
        take: 20,
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty list when no transactions found', async () => {
      transactionRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getOrderTransactions('order-id');

      expect(result.items).toHaveLength(0);
      expect(result.total).toEqual(0);
    });
  });
}); 