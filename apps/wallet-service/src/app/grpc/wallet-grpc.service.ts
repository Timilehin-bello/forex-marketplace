import { Injectable } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { WalletService } from '../services/wallet.service';
import { LoggerService } from '@forex-marketplace/shared-utils';
import { WalletTransactionDto } from '../dtos/transaction.dto';

@Injectable()
export class WalletGrpcService {
  constructor(
    private readonly walletService: WalletService,
    private readonly logger: LoggerService
  ) {}

  @GrpcMethod('WalletService', 'GetWalletByUserIdAndCurrency')
  async getWalletByUserIdAndCurrency(data: {
    userId: string;
    currency: string;
  }) {
    try {
      const { userId, currency } = data;
      const wallet = await this.walletService.getWalletByUserIdAndCurrency(
        userId,
        currency
      );

      return {
        id: wallet.id,
        userId: wallet.userId,
        currency: wallet.currency,
        balance: wallet.balance,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `gRPC GetWalletByUserIdAndCurrency error: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @GrpcMethod('WalletService', 'ProcessTransaction')
  async processTransaction(data: WalletTransactionDto) {
    try {
      const transaction = await this.walletService.processTransaction(data);

      return {
        id: transaction.id,
        walletId: transaction.walletId,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        referenceId: transaction.referenceId,
        createdAt: transaction.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `gRPC ProcessTransaction error: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @GrpcMethod('WalletService', 'CreateWallet')
  async createWallet(data: { userId: string; currency: string }) {
    try {
      const wallet = await this.walletService.createWallet(data);

      return {
        id: wallet.id,
        userId: wallet.userId,
        currency: wallet.currency,
        balance: wallet.balance,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `gRPC CreateWallet error: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
