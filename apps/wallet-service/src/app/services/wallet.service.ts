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
import { LoggerService } from '@forex-marketplace/shared-utils';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import {
  NotificationPattern,
  WalletNotificationEvent,
} from '@forex-marketplace/message-queue';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
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
    const wallet = await this.walletRepository.findOne({ where: { id } });
    if (!wallet) {
      this.logger.error(`Wallet with id ${id} not found`);
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({ where: { userId } });
  }

  async getWalletByUserIdAndCurrency(
    userId: string,
    currency: string
  ): Promise<Wallet> {
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
    walletId: string
  ): Promise<WalletTransaction[]> {
    return this.transactionRepository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
  }
}
