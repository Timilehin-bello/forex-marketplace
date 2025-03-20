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

  const mockOrder = {
    id: 'order-id',
    userId: 'user-id',
    type: OrderType.BUY,
    fromCurrency: 'USD',
    toCurrency: 'EUR',
    fromAmount: 1000,
    toAmount: 850,
    rate: 0.85,
    status: OrderStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    transactions: [],
  };

  const mockTransaction = {
    id: 'transaction-id',
    orderId: 'order-id',
    fromWalletId: 'from-wallet-id',
    toWalletId: 'to-wallet-id',
    fromAmount: 1000,
    toAmount: 850,
    rate: 0.85,
    createdAt: new Date(),
    updatedAt: new Date(),
    order: mockOrder,
  };

  const mockWallet = {
    id: 'wallet-id',
    userId: 'user-id',
    currency: 'USD',
    balance: 5000,
  };

  const mockUser = {
    id: 'user-id',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockRate = {
    baseCurrency: 'USD',
    targetCurrency: 'EUR',
    rate: 0.85,
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockQueryRunner = {
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
      },
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };

    // Mock gRPC services
    const mockRateService = {
      getRate: jest.fn().mockReturnValue(of(mockRate)),
      getAllRates: jest.fn().mockReturnValue(of({ rates: [mockRate] })),
    };

    const mockWalletService = {
      getWalletByUserIdAndCurrency: jest.fn().mockReturnValue(of(mockWallet)),
      processTransaction: jest.fn().mockReturnValue(of({ success: true, transactionId: 'transaction-id' })),
      createWallet: jest.fn().mockReturnValue(of({ walletId: 'wallet-id', currency: 'USD' })),
    };

    const mockUserService = {
      getUserById: jest.fn().mockReturnValue(of(mockUser)),
    };

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
            createQueryRunner: jest.fn().mockReturnValue({
              manager: {
                findOne: jest.fn().mockResolvedValue(mockOrder),
                save: jest.fn().mockImplementation(entity => Promise.resolve(entity)),
              } as any,
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
            }),
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
            getService: jest.fn().mockReturnValue(mockRateService),
          },
        },
        {
          provide: 'WALLET_SERVICE',
          useValue: {
            getService: jest.fn().mockReturnValue(mockWalletService),
          },
        },
        {
          provide: 'USER_SERVICE',
          useValue: {
            getService: jest.fn().mockReturnValue(mockUserService),
          },
        },
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: {
            emit: jest.fn().mockReturnValue(of({})),
          },
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
    it('should create a new order successfully', async () => {
      const createOrderDto = {
        userId: 'user-id',
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 100,
        type: OrderType.BUY,
      };

      const mockOrder = {
        ...createOrderDto,
        id: 'order-id',
        status: OrderStatus.PENDING,
        toAmount: 85,
        rate: 0.85,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTransaction = {
        id: 'transaction-id',
        orderId: mockOrder.id,
        fromWalletId: 'source-wallet-id',
        toWalletId: 'dest-wallet-id',
        fromAmount: mockOrder.fromAmount,
        toAmount: mockOrder.toAmount,
        rate: mockOrder.rate,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: mockOrder,
      };

      const mockQueryRunner = {
        manager: {
          findOne: jest.fn().mockResolvedValue(mockOrder),
          save: jest.fn().mockImplementation((entity) => {
            if (entity instanceof Transaction) {
              return Promise.resolve(mockTransaction);
            }
            return Promise.resolve(mockOrder);
          }),
        },
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner as any);
      orderRepository.create.mockReturnValue(mockOrder);
      orderRepository.save.mockResolvedValue(mockOrder);
      orderRepository.findOne.mockResolvedValue(mockOrder);
      transactionRepository.create.mockReturnValue(mockTransaction);

      // Mock rate service response
      rateClient.getService.mockReturnValue({
        getRate: jest.fn().mockReturnValue(
          of({
            rate: 0.85,
          })
        ),
      });

      // Mock wallet service responses
      walletServiceClient = {
        getWalletByUserIdAndCurrency: jest.fn().mockReturnValue(
          of({
            id: 'source-wallet-id',
            balance: 1000,
            currency: 'USD',
          })
        ),
        processTransaction: jest.fn().mockReturnValue(of({})),
      };

      // Mock user service response
      userServiceClient = {
        getUserById: jest.fn().mockReturnValue(
          of({
            id: 'user-id',
            email: 'user@example.com',
          })
        ),
      };

      // Mock notification client
      notificationClient.emit.mockReturnValue(of({}));

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
    });

    it('should handle rate service errors', async () => {
      const createOrderDto = {
        userId: 'user-id',
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 100,
        type: OrderType.BUY,
      };

      // Mock rate service to throw error
      rateClient.getService.mockReturnValue({
        getRate: jest.fn().mockReturnValue(
          throwError(() => new Error('Rate service error'))
        ),
      });

      await expect(service.createOrder(createOrderDto)).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('should return an order if found', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.getOrderById('order-id');

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-id' },
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.getOrderById('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('getUserOrders', () => {
    it('should return paginated orders for a user', async () => {
      orderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);

      const result = await service.getUserOrders('user-id');

      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
    });

    it('should handle pagination parameters', async () => {
      orderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);

      const result = await service.getUserOrders('user-id', 2, 20);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        skip: 20,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
    });
  });

  describe('getOrderTransactions', () => {
    it('should return paginated transactions for an order', async () => {
      transactionRepository.findAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.getOrderTransactions('order-id');

      expect(transactionRepository.findAndCount).toHaveBeenCalledWith({
        where: { orderId: 'order-id' },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
    });

    it('should handle pagination parameters', async () => {
      transactionRepository.findAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.getOrderTransactions('order-id', 2, 20);

      expect(transactionRepository.findAndCount).toHaveBeenCalledWith({
        where: { orderId: 'order-id' },
        skip: 20,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
    });
  });
}); 