import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { TransactionService } from './transaction.service';
import { Order } from '../entities/order.entity';
import { Transaction } from '../entities/transaction.entity';
import { LoggerService, CacheService } from '@forex-marketplace/shared-utils';
import { OrderStatus, OrderType } from '@forex-marketplace/shared-types';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { of, throwError } from 'rxjs';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TestUtils } from '../test/test-utils';
import { ClientGrpc } from '@nestjs/microservices';

describe('TransactionService', () => {
  let service: TransactionService;
  let orderRepository: Repository<Order>;
  let transactionRepository: Repository<Transaction>;
  let dataSource: DataSource;
  let cacheService: CacheService;
  let loggerService: LoggerService;
  let notificationClient: ClientProxy;
  let rateServiceClient: ClientGrpc;
  let walletServiceClient: ClientGrpc;
  let userServiceClient: ClientGrpc;
  let mockOrder: any;
  let mockTransaction: any;
  let rateService: any;
  let walletService: any;
  let userService: any;

  const mockWallet = TestUtils.createMockWallet();
  const mockUser = TestUtils.createMockUser();
  const mockRate = TestUtils.createMockRate();

  beforeEach(async () => {
    // Setup mock services
    rateService = {
      getRate: jest.fn().mockImplementation(() => {
        return {
          rate: 0.85,
          baseCurrency: 'USD',
          targetCurrency: 'EUR',
          timestamp: new Date().toISOString()
        };
      }),
      getAllRates: jest.fn().mockImplementation(() => {
        return {
          rates: [mockRate]
        };
      })
    };

    walletService = {
      getWalletByUserIdAndCurrency: jest.fn().mockImplementation(() => {
        return mockWallet;
      }),
      processTransaction: jest.fn().mockImplementation(() => {
        return { success: true, transactionId: 'transaction-id' };
      }),
      createWallet: jest.fn().mockImplementation(() => {
        return { walletId: 'wallet-id', currency: 'EUR' };
      })
    };

    userService = {
      getUserById: jest.fn().mockImplementation(() => {
        return mockUser;
      })
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
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                findOne: jest.fn(),
                save: jest.fn(),
              },
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            invalidatePattern: jest.fn(),
            getOrSet: jest.fn().mockImplementation(async (key, fetchFn) => {
              return fetchFn();
            }),
          },
        },
        {
          provide: 'RATE_SERVICE',
          useValue: {
            getService: jest.fn().mockReturnValue(rateService)
          },
        },
        {
          provide: 'WALLET_SERVICE',
          useValue: {
            getService: jest.fn().mockReturnValue(walletService)
          },
        },
        {
          provide: 'USER_SERVICE',
          useValue: {
            getService: jest.fn().mockReturnValue(userService)
          },
        },
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    orderRepository = module.get(getRepositoryToken(Order));
    transactionRepository = module.get(getRepositoryToken(Transaction));
    dataSource = module.get(DataSource);
    cacheService = module.get<CacheService>(CacheService);
    loggerService = module.get(LoggerService);
    
    rateServiceClient = module.get('RATE_SERVICE');
    walletServiceClient = module.get('WALLET_SERVICE');
    userServiceClient = module.get('USER_SERVICE');
    notificationClient = module.get('NOTIFICATION_SERVICE');
    
    // Mock data
    mockOrder = {
      id: 'order-id',
      userId: 'user-id',
      type: OrderType.BUY,
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      fromAmount: 100,
      toAmount: 85,
      rate: 0.85,
      status: OrderStatus.COMPLETED,
      createdAt: new Date('2025-03-20T16:45:16.694Z'),
      updatedAt: new Date('2025-03-20T16:45:16.694Z'),
      transactions: [],
    };
    
    mockTransaction = {
      id: 'transaction-id',
      orderId: 'order-id',
      fromWalletId: 'wallet1',
      toWalletId: 'wallet2',
      fromAmount: 100,
      toAmount: 85,
      rate: 0.85,
      createdAt: new Date('2025-03-20T16:45:16.694Z'),
    };
    
    // Setup repository mock responses
    jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);
    jest.spyOn(orderRepository, 'findAndCount').mockResolvedValue([[mockOrder], 1]);
    jest.spyOn(orderRepository, 'create').mockReturnValue(mockOrder);
    jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder);
    
    jest.spyOn(transactionRepository, 'findAndCount').mockResolvedValue([[mockTransaction], 1]);
    jest.spyOn(transactionRepository, 'create').mockReturnValue(mockTransaction);
    jest.spyOn(transactionRepository, 'save').mockResolvedValue(mockTransaction);
    
    // Setup queryRunner mock
    const mockQueryRunner = dataSource.createQueryRunner();
    jest.spyOn(mockQueryRunner.manager, 'findOne').mockResolvedValue(mockOrder);
    jest.spyOn(mockQueryRunner.manager, 'save').mockResolvedValue(mockOrder);
    
    // Spy on firstValueFrom for handling Observable results
    jest.spyOn(require('rxjs'), 'firstValueFrom').mockImplementation(async (observable: any) => {
      // If observable is a function that returns a value (our mock setup), return that value
      if (typeof observable === 'function') {
        return observable();
      }
      
      // For mocked gRPC response objects
      if (observable && observable.rate !== undefined) {
        return observable;
      }
      
      if (observable && observable.id !== undefined) {
        return observable;
      }
      
      if (observable && observable.success !== undefined) {
        return observable;
      }
      
      if (observable && observable.walletId !== undefined) {
        return observable;
      }
      
      // Default fallback
      return mockOrder;
    });

    // Call onModuleInit manually since it's not called in tests
    (service as any).onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrderById with caching', () => {
    it('should return cached order if available', async () => {
      jest.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(mockOrder);
      
      const result = await service.getOrderById('order-id');
      
      expect(result).toEqual(mockOrder);
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'order:order-id',
        expect.any(Function),
        expect.any(Number)
      );
    });
    
    it('should fetch from database and cache if not in cache', async () => {
      const fetchFn = jest.fn().mockResolvedValue(mockOrder);
      jest.spyOn(cacheService, 'getOrSet').mockImplementationOnce(async (key, fn) => {
        return fn();
      });
      
      const result = await service.getOrderById('order-id');
      
      expect(result).toEqual(mockOrder);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-id' }
      });
    });
    
    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(cacheService, 'getOrSet').mockImplementationOnce(async (key, fn) => {
        return fn();
      });
      
      await expect(service.getOrderById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserOrders with caching', () => {
    const mockPaginatedResult = {
      items: [mockOrder],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
    
    it('should return cached user orders if available', async () => {
      jest.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(mockPaginatedResult);
      
      const result = await service.getUserOrders('user-id', 1, 10);
      
      expect(result).toEqual(mockPaginatedResult);
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'user_orders:user-id:1:10',
        expect.any(Function),
        expect.any(Number)
      );
    });
    
    it('should fetch from database and cache if not in cache', async () => {
      jest.spyOn(cacheService, 'getOrSet').mockImplementationOnce(async (key, fn) => {
        return fn();
      });
      
      const result = await service.getUserOrders('user-id', 1, 10);
      
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });
  
  describe('getOrderTransactions with caching', () => {
    const mockPaginatedResult = {
      items: [mockTransaction],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
    
    it('should return cached transactions if available', async () => {
      jest.spyOn(cacheService, 'getOrSet').mockResolvedValueOnce(mockPaginatedResult);
      
      const result = await service.getOrderTransactions('order-id', 1, 10);
      
      expect(result).toEqual(mockPaginatedResult);
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'order_transactions:order-id:1:10',
        expect.any(Function),
        expect.any(Number)
      );
    });
    
    it('should fetch from database and cache if not in cache', async () => {
      jest.spyOn(cacheService, 'getOrSet').mockImplementationOnce(async (key, fn) => {
        return fn();
      });
      
      const result = await service.getOrderTransactions('order-id', 1, 10);
      
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(transactionRepository.findAndCount).toHaveBeenCalledWith({
        where: { orderId: 'order-id' },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });
  
  describe('createOrder', () => {
    const createOrderDto = {
      userId: 'user-id',
      type: OrderType.BUY,
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      fromAmount: 100,
    };
    
    it('should create an order and process it', async () => {
      // Spy on processOrder private method
      jest.spyOn(service as any, 'processOrder').mockResolvedValueOnce(undefined);
      
      const result = await service.createOrder(createOrderDto);
      
      expect(result).toEqual(mockOrder);
      expect(cacheService.delete).toHaveBeenCalledWith('user_orders:user-id');
      expect(service['processOrder']).toHaveBeenCalledWith(mockOrder.id);
    });
  });
  
  describe('Cache invalidation', () => {
    it('should invalidate cache when creating an order', async () => {
      // Spy on processOrder private method
      jest.spyOn(service as any, 'processOrder').mockResolvedValueOnce(undefined);
      
      await service.createOrder({
        userId: 'user-id',
        type: OrderType.BUY,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 100,
      });
      
      expect(cacheService.delete).toHaveBeenCalledWith('user_orders:user-id');
    });
  });
}); 