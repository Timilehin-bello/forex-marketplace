import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { CreateWalletDto } from '../dtos/create-wallet.dto';
import { WalletTransactionDto } from '../dtos/transaction.dto';
import { LoggerService, CacheService } from '@forex-marketplace/shared-utils';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import {
  NotificationPattern,
  WalletNotificationEvent,
} from '@forex-marketplace/message-queue';
import {
  PaginatedResult,
  PaginationHelper,
} from '@forex-marketplace/shared-types';

@Injectable()
export class WalletService {
  private readonly WALLET_CACHE_TTL = 300; // 5 minutes
  private readonly USER_WALLETS_CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy
  ) {}

  async createWallet(createWalletDto: CreateWalletDto): Promise<Wallet> {
    const { userId, currency } = createWalletDto;

    // Check if wallet already exists
    const existingWallet = await this.walletRepository.findOne({
      where: { userId, currency },
    });

    if (existingWallet) {
      this.logger.error(
        `Wallet for user ${userId} with currency ${currency} already exists`
      );
      throw new ConflictException(
        `Wallet for currency ${currency} already exists for this user`
      );
    }

    // Create new wallet
    const wallet = this.walletRepository.create(createWalletDto);
    const savedWallet = await this.walletRepository.save(wallet);

    // Invalidate user wallets cache
    await this.cacheService.invalidatePattern(`user_wallets:${userId}:*`);

    // Send notification
    this.notificationClient.emit(
      NotificationPattern.SEND_WALLET_NOTIFICATION,
      new WalletNotificationEvent(
        userId,
        savedWallet.id,
        currency,
        'CREATED',
        '', // Email needs to be fetched from user service in a real implementation
        { walletId: savedWallet.id }
      )
    );

    return savedWallet;
  }

  async getWalletById(id: string): Promise<Wallet> {
    const cacheKey = `wallet:${id}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const wallet = await this.walletRepository.findOne({ where: { id } });
        if (!wallet) {
          this.logger.error(`Wallet with id ${id} not found`);
          throw new NotFoundException('Wallet not found');
        }
        return wallet;
      },
      this.WALLET_CACHE_TTL
    );
  }

  async getWalletsByUserId(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResult<Wallet>> {
    const cacheKey = `user_wallets:${userId}:${page}:${limit}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [items, total] = await this.walletRepository.findAndCount({
          where: { userId },
          skip: (page - 1) * limit,
          take: limit,
          order: { currency: 'ASC' },
        });

        return PaginationHelper.paginate(items, total, page, limit);
      },
      this.USER_WALLETS_CACHE_TTL
    );
  }

  async getWalletByUserIdAndCurrency(
    userId: string,
    currency: string
  ): Promise<Wallet> {
    const cacheKey = `wallet:${userId}:${currency}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const wallet = await this.walletRepository.findOne({
          where: { userId, currency },
        });

        if (!wallet) {
          this.logger.error(
            `Wallet for user ${userId} with currency ${currency} not found`
          );
          throw new NotFoundException(`Wallet for currency ${currency} not found`);
        }

        return wallet;
      },
      this.WALLET_CACHE_TTL
    );
  }

  async processTransaction(
    transactionDto: WalletTransactionDto
  ): Promise<WalletTransaction> {
    const { walletId, type, amount, description, referenceId } = transactionDto;

    this.logger.log(
      `Processing transaction: ${JSON.stringify(transactionDto)}`
    );
    this.logger.log(
      `Amount before processing: ${amount}, Type: ${typeof amount}`
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get the wallet with lock for update
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet with ID ${walletId} not found`);
      }

      this.logger.log(`Wallet before update: ${JSON.stringify(wallet)}`);

      // Update wallet balance - ensure we're working with proper numeric values
      const numericAmount = Number(amount);

      if (type === 'CREDIT') {
        wallet.balance = Number(wallet.balance) + numericAmount;
      } else if (type === 'DEBIT') {
        if (Number(wallet.balance) < numericAmount) {
          throw new BadRequestException('Insufficient funds');
        }
        wallet.balance = Number(wallet.balance) - numericAmount;
      }

      this.logger.log(`Wallet after update: ${JSON.stringify(wallet)}`);

      // Save updated wallet
      await queryRunner.manager.save(wallet);

      // Create transaction record
      const transaction = this.transactionRepository.create({
        walletId,
        type,
        amount,
        description,
        referenceId,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      // Commit the transaction
      await queryRunner.commitTransaction();

      // Invalidate caches
      await this.cacheService.delete(`wallet:${walletId}`);
      await this.cacheService.delete(`wallet:${wallet.userId}:${wallet.currency}`);
      await this.cacheService.invalidatePattern(`user_wallets:${wallet.userId}:*`);
      await this.cacheService.invalidatePattern(`wallet_transactions:${walletId}:*`);

      // Send notification
      this.notificationClient.emit(
        NotificationPattern.SEND_WALLET_NOTIFICATION,
        new WalletNotificationEvent(
          wallet.userId,
          wallet.id,
          wallet.currency,
          type,
          '', // Email needs to be fetched from user service in a real implementation
          {
            walletId: wallet.id,
            amount,
            transactionId: savedTransaction.id,
          }
        )
      );

      return savedTransaction;
    } catch (error) {
      // Rollback in case of error
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error processing wallet transaction: ${error.message}`,
        error.stack
      );
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  async getTransactionsByWalletId(
    walletId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResult<WalletTransaction>> {
    const cacheKey = `wallet_transactions:${walletId}:${page}:${limit}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [items, total] = await this.transactionRepository.findAndCount({
          where: { walletId },
          skip: (page - 1) * limit,
          take: limit,
          order: { createdAt: 'DESC' },
        });

        return PaginationHelper.paginate(items, total, page, limit);
      },
      this.WALLET_CACHE_TTL
    );
  }
}
