import { Wallet } from '../entities/wallet.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { of } from 'rxjs';
import { jest } from '@jest/globals';

export class TestUtils {
  static createMockWallet(overrides: Partial<Wallet> = {}): Wallet {
    return {
      id: 'wallet-id',
      userId: 'user-id',
      currency: 'USD',
      balance: 1000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactions: [],
      ...overrides,
    } as Wallet;
  }

  static createMockWalletTransaction(overrides: Partial<WalletTransaction> = {}): WalletTransaction {
    const wallet = this.createMockWallet();
    return {
      id: 'transaction-id',
      walletId: wallet.id,
      wallet: wallet,
      type: 'CREDIT' as const,
      amount: 100,
      description: 'Test transaction',
      referenceId: 'ref-123',
      createdAt: new Date(),
      ...overrides,
    } as WalletTransaction;
  }

  static createMockUser(overrides: any = {}) {
    return {
      id: 'user-id',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static createMockQueryRunner(overrides: any = {}) {
    return {
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        ...overrides.manager,
      },
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      ...overrides,
    };
  }

  static createMockNotificationService(overrides: any = {}) {
    return {
      emit: jest.fn().mockReturnValue(of({})),
      ...overrides,
    };
  }

  static createMockUserService(overrides: any = {}) {
    return {
      getUserById: jest.fn().mockReturnValue(of(this.createMockUser())),
      ...overrides,
    };
  }

  static async simulateConcurrentOperation(
    operation: () => Promise<any>,
    numberOfConcurrentCalls = 5
  ): Promise<any[]> {
    const operations = Array(numberOfConcurrentCalls).fill(operation);
    return Promise.all(operations.map(op => op()));
  }

  static async simulateTimeout(operation: () => Promise<any>, timeoutMs = 1000): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });
    return Promise.race([operation(), timeoutPromise]);
  }
} 