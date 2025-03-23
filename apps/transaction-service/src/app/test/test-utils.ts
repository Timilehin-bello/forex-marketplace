import { Order } from '../entities/order.entity';
import { Transaction } from '../entities/transaction.entity';
import { OrderStatus, OrderType } from '@forex-marketplace/shared-types';
import { of } from 'rxjs';
import { jest } from '@jest/globals';

export class TestUtils {
  static createMockOrder(overrides: Partial<Order> = {}): Order {
    return {
      id: 'order-id',
      userId: 'user-id',
      type: 'BUY',
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      fromAmount: 100,
      toAmount: 85,
      rate: 0.85,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      transactions: [],
      ...overrides,
    } as Order;
  }

  static createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
    const order = this.createMockOrder();
    return {
      id: 'transaction-id',
      orderId: order.id,
      order: order,
      fromWalletId: 'from-wallet-id',
      toWalletId: 'to-wallet-id',
      fromAmount: 100,
      toAmount: 85,
      rate: 0.85,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Transaction;
  }

  static createMockWallet(overrides: any = {}) {
    return {
      id: 'wallet-id',
      userId: 'user-id',
      currency: 'USD',
      balance: 5000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
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

  static createMockRate(overrides: any = {}) {
    return {
      baseCurrency: 'USD',
      targetCurrency: 'EUR',
      rate: 0.85,
      timestamp: new Date().toISOString(),
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

  static createMockRateService(overrides: any = {}) {
    return {
      getRate: jest.fn().mockReturnValue(of(this.createMockRate())),
      getAllRates: jest.fn().mockReturnValue(of({ rates: [this.createMockRate()] })),
      ...overrides,
    };
  }

  static createMockWalletService(overrides: any = {}) {
    return {
      getWalletByUserIdAndCurrency: jest.fn().mockReturnValue(of(this.createMockWallet())),
      processTransaction: jest.fn().mockReturnValue(of({ success: true, transactionId: 'transaction-id' })),
      createWallet: jest.fn().mockReturnValue(of({ walletId: 'wallet-id', currency: 'USD' })),
      ...overrides,
    };
  }

  static createMockUserService(overrides: any = {}) {
    return {
      getUserById: jest.fn().mockReturnValue(of(this.createMockUser())),
      ...overrides,
    };
  }

  static createMockNotificationService(overrides: any = {}) {
    return {
      emit: jest.fn().mockReturnValue(of({})),
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