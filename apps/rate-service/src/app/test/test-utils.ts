import { ForexRate } from '../entities/rate.entity';
import { of } from 'rxjs';
import { jest } from '@jest/globals';

export class TestUtils {
  static createMockRate(overrides: Partial<ForexRate> = {}): ForexRate {
    return {
      id: 'rate-id',
      baseCurrency: 'USD',
      targetCurrency: 'EUR',
      rate: 0.85,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as ForexRate;
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

  static async simulateConcurrentOperation(
    operation: () => Promise<any>,
    numberOfConcurrentCalls: number = 5
  ): Promise<any[]> {
    const operations = Array(numberOfConcurrentCalls).fill(operation);
    return Promise.all(operations.map(op => op()));
  }

  static async simulateTimeout(operation: () => Promise<any>, timeoutMs: number = 1000): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });
    return Promise.race([operation(), timeoutPromise]);
  }
} 