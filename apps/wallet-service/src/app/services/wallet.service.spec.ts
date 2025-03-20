import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { WalletService } from './wallet.service';
import { Wallet } from '../entities/wallet.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { LoggerService } from '@forex-marketplace/shared-utils';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateWalletDto } from '../dtos/create-wallet.dto';
import { WalletTransactionDto } from '../dtos/transaction.dto';
import { of } from 'rxjs';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: jest.Mocked<Repository<Wallet>>;
  let transactionRepository: jest.Mocked<Repository<WalletTransaction>>;
  let dataSource: jest.Mocked<DataSource>;
  let loggerService: jest.Mocked<LoggerService>;
  let notificationClient: jest.Mocked<ClientProxy>;

  const mockWallet = {
    id: 'wallet-id',
    userId: 'user-id',
    currency: 'USD',
    balance: 100,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {
    id: 'transaction-id',
    walletId: 'wallet-id',
    wallet: mockWallet,
    type: 'CREDIT' as const,
    amount: 100,
    description: 'Test deposit',
    referenceId: 'ref-id',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockQueryRunner = {
      manager: {
        findOne: jest.fn().mockResolvedValue(mockWallet),
        save: jest.fn().mockImplementation(entity => Promise.resolve(entity)),
      } as any,
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
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
          provide: 'NOTIFICATION_SERVICE',
          useValue: {
            emit: jest.fn().mockReturnValue(of({})),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get(getRepositoryToken(Wallet)) as jest.Mocked<Repository<Wallet>>;
    transactionRepository = module.get(getRepositoryToken(WalletTransaction)) as jest.Mocked<Repository<WalletTransaction>>;
    dataSource = module.get(DataSource) as jest.Mocked<DataSource>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
    notificationClient = module.get('NOTIFICATION_SERVICE') as jest.Mocked<ClientProxy>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWallet', () => {
    it('should create a new wallet successfully', async () => {
      const createWalletDto = {
        userId: 'user-id',
        currency: 'USD',
      };

      const mockWallet = {
        ...createWalletDto,
        id: 'wallet-id',
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      walletRepository.findOne.mockResolvedValue(null);
      walletRepository.create.mockReturnValue(mockWallet);
      walletRepository.save.mockResolvedValue(mockWallet);

      const result = await service.createWallet(createWalletDto);

      expect(walletRepository.findOne).toHaveBeenCalledWith({
        where: { userId: createWalletDto.userId, currency: createWalletDto.currency },
      });
      expect(walletRepository.create).toHaveBeenCalledWith(createWalletDto);
      expect(walletRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockWallet);
    });

    it('should throw ConflictException if wallet already exists', async () => {
      walletRepository.findOne.mockResolvedValue(mockWallet);

      await expect(service.createWallet({ userId: 'user-id', currency: 'USD' })).rejects.toThrow(ConflictException);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('getWalletById', () => {
    it('should return a wallet if found', async () => {
      walletRepository.findOne.mockResolvedValue(mockWallet);

      const result = await service.getWalletById('wallet-id');

      expect(walletRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'wallet-id' },
      });
      expect(result).toEqual(mockWallet);
    });

    it('should throw NotFoundException if wallet not found', async () => {
      walletRepository.findOne.mockResolvedValue(null);

      await expect(service.getWalletById('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('processTransaction', () => {
    const depositDto: WalletTransactionDto = {
      walletId: 'wallet-id',
      type: 'CREDIT',
      amount: 100,
      description: 'Test deposit',
    };

    const withdrawDto: WalletTransactionDto = {
      walletId: 'wallet-id',
      type: 'DEBIT',
      amount: 50,
      description: 'Test withdrawal',
    };

    it('should process a deposit transaction successfully', async () => {
      const mockQueryRunner = dataSource.createQueryRunner();
      (mockQueryRunner.manager.findOne as jest.Mock).mockResolvedValue(mockWallet);
      (mockQueryRunner.manager.save as jest.Mock).mockResolvedValue(mockTransaction);

      const result = await service.processTransaction(depositDto);

      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(notificationClient.emit).toHaveBeenCalled();
    });

    it('should process a withdrawal transaction successfully', async () => {
      const mockQueryRunner = dataSource.createQueryRunner();
      (mockQueryRunner.manager.findOne as jest.Mock).mockResolvedValue(mockWallet);
      (mockQueryRunner.manager.save as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        type: 'DEBIT' as const,
      });

      const result = await service.processTransaction(withdrawDto);

      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(notificationClient.emit).toHaveBeenCalled();
    });

    it('should throw BadRequestException if insufficient balance for withdrawal', async () => {
      const largeWithdrawalDto: WalletTransactionDto = {
        walletId: 'wallet-id',
        type: 'DEBIT',
        amount: 1000, // More than current balance
        description: 'Large withdrawal',
      };
      
      const mockQueryRunner = dataSource.createQueryRunner();
      (mockQueryRunner.manager.findOne as jest.Mock).mockResolvedValue({
        ...mockWallet,
        balance: 100, // Less than withdrawal amount
      });

      await expect(service.processTransaction(largeWithdrawalDto)).rejects.toThrow(BadRequestException);
    });

    it('should rollback transaction on error', async () => {
      const mockQueryRunner = dataSource.createQueryRunner();
      (mockQueryRunner.manager.findOne as jest.Mock).mockResolvedValue(mockWallet);
      (mockQueryRunner.manager.save as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.processTransaction(depositDto)).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getWalletsByUserId', () => {
    it('should return paginated wallets for a user', async () => {
      walletRepository.findAndCount.mockResolvedValue([[mockWallet], 1]);

      const result = await service.getWalletsByUserId('user-id');

      expect(walletRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        skip: 0,
        take: 10,
        order: { currency: 'ASC' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
    });

    it('should handle pagination parameters', async () => {
      walletRepository.findAndCount.mockResolvedValue([[mockWallet], 1]);

      const result = await service.getWalletsByUserId('user-id', 2, 20);

      expect(walletRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        skip: 20,
        take: 20,
        order: { currency: 'ASC' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
    });
  });

  describe('getWalletByUserIdAndCurrency', () => {
    it('should return a wallet by userId and currency', async () => {
      walletRepository.findOne.mockResolvedValue(mockWallet);

      const result = await service.getWalletByUserIdAndCurrency('user-id', 'USD');

      expect(walletRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-id', currency: 'USD' },
      });
      expect(result).toEqual(mockWallet);
    });

    it('should throw NotFoundException if wallet not found', async () => {
      walletRepository.findOne.mockResolvedValue(null);

      await expect(service.getWalletByUserIdAndCurrency('user-id', 'EUR')).rejects.toThrow(NotFoundException);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('getTransactionsByWalletId', () => {
    it('should return paginated transactions for a wallet', async () => {
      transactionRepository.findAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.getTransactionsByWalletId('wallet-id');

      expect(transactionRepository.findAndCount).toHaveBeenCalledWith({
        where: { walletId: 'wallet-id' },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
    });

    it('should handle pagination parameters', async () => {
      transactionRepository.findAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.getTransactionsByWalletId('wallet-id', 2, 20);

      expect(transactionRepository.findAndCount).toHaveBeenCalledWith({
        where: { walletId: 'wallet-id' },
        skip: 20,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
    });
  });
}); 