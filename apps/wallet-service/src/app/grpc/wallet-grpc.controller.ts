import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { WalletService } from '../services/wallet.service';
import { LoggerService } from '@forex-marketplace/shared-utils';
import { WalletTransactionDto } from '../dtos/transaction.dto';

interface WalletByUserCurrencyRequest {
  userId: string;
  currency: string;
}

interface WalletResponse {
  id: string;
  userId: string;
  currency: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

interface TransactionRequest {
  walletId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  referenceId: string;
}

interface TransactionResponse {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  description: string;
  referenceId: string;
  createdAt: string;
}

interface CreateWalletRequest {
  userId: string;
  currency: string;
}

@Controller()
export class WalletGrpcController {
  private readonly logger = new Logger(WalletGrpcController.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly loggerService: LoggerService
  ) {
    this.loggerService.log('WalletGrpcController initialized');
    this.logger.log('WalletGrpcController initialized with NestJS Logger');
    this.logger.log('Available gRPC methods:');
    this.logger.log('- GetWalletByUserIdAndCurrency');
    this.logger.log('- ProcessTransaction');
    this.logger.log('- CreateWallet');
  }

  @GrpcMethod('WalletService', 'GetWalletByUserIdAndCurrency')
  async getWalletByUserIdAndCurrency(
    data: WalletByUserCurrencyRequest
  ): Promise<WalletResponse> {
    this.logger.log(
      `gRPC GetWalletByUserIdAndCurrency called with data: ${JSON.stringify(
        data
      )}`
    );
    this.loggerService.log(
      `gRPC GetWalletByUserIdAndCurrency called with data: ${JSON.stringify(
        data
      )}`
    );
    try {
      const { userId, currency } = data;
      const wallet = await this.walletService.getWalletByUserIdAndCurrency(
        userId,
        currency
      );

      const response: WalletResponse = {
        id: wallet.id,
        userId: wallet.userId,
        currency: wallet.currency,
        balance: wallet.balance,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString(),
      };

      this.logger.log(
        `gRPC GetWalletByUserIdAndCurrency response: ${JSON.stringify(
          response
        )}`
      );
      this.loggerService.log(
        `gRPC GetWalletByUserIdAndCurrency response: ${JSON.stringify(
          response
        )}`
      );
      return response;
    } catch (error) {
      this.logger.error(
        `gRPC GetWalletByUserIdAndCurrency error: ${error.message}`,
        error.stack
      );
      this.loggerService.error(
        `gRPC GetWalletByUserIdAndCurrency error: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @GrpcMethod('WalletService', 'ProcessTransaction')
  async processTransaction(
    data: TransactionRequest
  ): Promise<TransactionResponse> {
    this.logger.log(
      `gRPC ProcessTransaction called with data: ${JSON.stringify(data)}`
    );
    this.loggerService.log(
      `gRPC ProcessTransaction called with data: ${JSON.stringify(data)}`
    );
    try {
      // Convert to DTO
      const transactionDto: WalletTransactionDto = {
        walletId: data.walletId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        referenceId: data.referenceId,
      };

      const transaction = await this.walletService.processTransaction(
        transactionDto
      );

      const response: TransactionResponse = {
        id: transaction.id,
        walletId: transaction.walletId,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        referenceId: transaction.referenceId,
        createdAt: transaction.createdAt.toISOString(),
      };

      this.logger.log(
        `gRPC ProcessTransaction response: ${JSON.stringify(response)}`
      );
      this.loggerService.log(
        `gRPC ProcessTransaction response: ${JSON.stringify(response)}`
      );
      return response;
    } catch (error) {
      this.logger.error(
        `gRPC ProcessTransaction error: ${error.message}`,
        error.stack
      );
      this.loggerService.error(
        `gRPC ProcessTransaction error: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @GrpcMethod('WalletService', 'CreateWallet')
  async createWallet(data: CreateWalletRequest): Promise<WalletResponse> {
    this.logger.log(
      `gRPC CreateWallet called with data: ${JSON.stringify(data)}`
    );
    this.loggerService.log(
      `gRPC CreateWallet called with data: ${JSON.stringify(data)}`
    );
    try {
      const { userId, currency } = data;
      // Based on the wallet service implementation, it either expects:
      // - A single wallet object parameter, or
      // - Two separate parameters
      const wallet = await this.walletService.createWallet({
        userId,
        currency,
      });

      const response: WalletResponse = {
        id: wallet.id,
        userId: wallet.userId,
        currency: wallet.currency,
        balance: wallet.balance,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString(),
      };

      this.logger.log(
        `gRPC CreateWallet response: ${JSON.stringify(response)}`
      );
      this.loggerService.log(
        `gRPC CreateWallet response: ${JSON.stringify(response)}`
      );
      return response;
    } catch (error) {
      this.logger.error(
        `gRPC CreateWallet error: ${error.message}`,
        error.stack
      );
      this.loggerService.error(
        `gRPC CreateWallet error: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
