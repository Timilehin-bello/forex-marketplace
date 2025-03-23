import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ForexRate } from '../entities/rate.entity';
import { RateService } from './rate.service';
import { LoggerService, CacheService } from '@forex-marketplace/shared-utils';
import { of, throwError } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { TestUtils } from '../test/test-utils';

describe('RateService', () => {
  let service: RateService;
  let rateRepository: jest.Mocked<Repository<ForexRate>>;
  let httpService: jest.Mocked<HttpService>;
  let loggerService: jest.Mocked<LoggerService>;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;
  let loggerSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  const mockRate = TestUtils.createMockRate({
    baseCurrency: 'USD',
    targetCurrency: 'EUR',
    rate: 0.85,
  });

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup spies on the Logger prototype methods
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateService,
        {
          provide: getRepositoryToken(ForexRate),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(), 
            save: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn().mockReturnValue(undefined),
            error: jest.fn().mockReturnValue(undefined),
            warn: jest.fn().mockReturnValue(undefined),
            debug: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            getOrSet: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            invalidatePattern: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RateService>(RateService);
    rateRepository = module.get(getRepositoryToken(ForexRate)) as jest.Mocked<Repository<ForexRate>>;
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    cacheService = module.get(CacheService) as jest.Mocked<CacheService>;
  });

  afterEach(() => {
    // Restore original Logger implementations
    jest.restoreAllMocks();
  });

  // Test cases for getRate method
  describe('getRate', () => {
    it('should return rate from cache if available', async () => {
      // Mock the cache hit
      jest.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fetchFn) => {
        return mockRate;
      });

      const result = await service.getRate('USD', 'EUR');
      expect(result).toEqual(mockRate);
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'rate:USD:EUR',
        expect.any(Function),
        300
      );
    });

    it('should fetch rate from DB if not in cache', async () => {
      // Mock the cache miss but DB hit
      jest.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fetchFn) => {
        return await fetchFn();
      });

      jest.spyOn(rateRepository, 'findOne').mockResolvedValue(mockRate);

      const result = await service.getRate('USD', 'EUR');
      expect(result).toEqual(mockRate);
      expect(rateRepository.findOne).toHaveBeenCalledWith({
        where: { baseCurrency: 'USD', targetCurrency: 'EUR' },
      });
    });

    it('should throw NotFoundException if rate not found', async () => {
      // Mock the cache to not find anything
      jest.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fetchFn) => {
        return await fetchFn();
      });

      // Mock the repository to not find the rate
      jest.spyOn(rateRepository, 'findOne').mockResolvedValue(null);
      
      // Now test that it throws
      await expect(service.getRate('USD', 'XYZ')).rejects.toThrow(NotFoundException);
      
      // Verify the logger is called when the service runs
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock the cache to throw an error
      jest.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fetchFn) => {
        return await fetchFn();
      });

      // Mock the repository to throw an error
      const dbError = new Error('Database error');
      jest.spyOn(rateRepository, 'findOne').mockRejectedValue(dbError);
      
      // Now test that it throws
      await expect(service.getRate('USD', 'EUR')).rejects.toThrow();
      
      // Verify the logger is called
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should validate currency codes', async () => {
      // We need to mock cacheService.getOrSet to pass through to the validation logic
      jest.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fetchFn) => {
        return await fetchFn();
      });

      await expect(service.getRate('', 'EUR')).rejects.toThrow(BadRequestException);
      await expect(service.getRate('USD', '')).rejects.toThrow(BadRequestException);
    });

    it('should attempt to calculate cross-rates if direct rate not found', async () => {
      // Mock cache miss
      jest.spyOn(cacheService, 'getOrSet').mockImplementation(async (key, fetchFn) => {
        return await fetchFn();
      });

      // Mock direct pair not found
      jest.spyOn(rateRepository, 'findOne').mockImplementation(async (options: any) => {
        const { baseCurrency, targetCurrency } = options.where;
        if (baseCurrency === 'EUR' && targetCurrency === 'JPY') {
          return null;
        }
        if (baseCurrency === 'USD' && targetCurrency === 'EUR') {
          return { baseCurrency: 'USD', targetCurrency: 'EUR', rate: 0.85 } as ForexRate;
        }
        if (baseCurrency === 'USD' && targetCurrency === 'JPY') {
          return { baseCurrency: 'USD', targetCurrency: 'JPY', rate: 110 } as ForexRate;
        }
        return null;
      });

      // Mock repository create
      jest.spyOn(rateRepository, 'create').mockImplementation((data) => {
        return data as ForexRate;
      });

      const result = await service.getRate('EUR', 'JPY');
      expect(result).toBeDefined();
      expect(result.rate).toBeCloseTo(110 / 0.85, 5);
    });
  });

  // Test cases for fetchAndUpdateRates method
  describe('fetchAndUpdateRates', () => {
    it('should fetch and update rates successfully', async () => {
      // Setup process.env for testing
      const originalEnv = process.env;
      process.env = { ...originalEnv, EXCHANGE_RATE_API_KEY: 'test-api-key' };
      
      // Setup the HTTP service to return data
      const mockResponse = {
        data: {
          result: 'success',
          time_last_update_unix: Date.now() / 1000,
          conversion_rates: {
            'EUR': 0.85,
            'GBP': 0.75,
            'JPY': 110.5,
          }
        }
      };
      
      const httpGetSpy = jest.spyOn(httpService, 'get');
      httpGetSpy.mockImplementation(() => {
        return of(mockResponse as any); // Cast to any to bypass type checking
      });
      
      // Setup repository mock
      jest.spyOn(rateRepository, 'save').mockResolvedValue({} as ForexRate);
      jest.spyOn(rateRepository, 'create').mockImplementation((data) => data as ForexRate);
      jest.spyOn(rateRepository, 'findOne').mockResolvedValue(null);
      
      // Run the method
      await service.fetchAndUpdateRates();
      
      // Verify the HTTP call was made 5 times (for each base currency)
      expect(httpGetSpy).toHaveBeenCalledTimes(5);
      
      // Clean up
      process.env = originalEnv;
      
      // Verify the logger was called
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should handle errors when fetching rates', async () => {
      // Setup process.env for testing
      const originalEnv = process.env;
      process.env = { ...originalEnv, EXCHANGE_RATE_API_KEY: 'test-api-key' };
      
      // Mock the HTTP service to throw an error
      jest.spyOn(httpService, 'get').mockImplementation(() => {
        return throwError(() => new Error('API Error'));
      });
      
      // Run the method and expect it to throw
      await expect(service.fetchAndUpdateRates()).rejects.toThrow();
      
      // Clean up
      process.env = originalEnv;
      
      // Verify the logger was called
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // Test cases for getAllRates method
  describe('getAllRates', () => {
    it('should retrieve all rates with pagination', async () => {
      const mockRates = [mockRate];
      const mockTotal = 1;
      
      jest.spyOn(rateRepository, 'findAndCount').mockResolvedValue([mockRates, mockTotal]);
      
      const result = await service.getAllRates(1, 10);
      
      expect(result.items).toEqual(mockRates);
      expect(result.total).toEqual(mockTotal);
      expect(result.page).toEqual(1);
      expect(result.limit).toEqual(10);
    });

    it('should handle database errors gracefully', async () => {
      // Mock the repository to throw an error
      const dbError = new Error('Database error');
      jest.spyOn(rateRepository, 'findAndCount').mockRejectedValue(dbError);
      
      // Now test that it throws
      await expect(service.getAllRates()).rejects.toThrow();
      
      // Verify the logger was called
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // Test cases for convertCurrency method
  describe('convertCurrency', () => {
    it('should convert currency correctly', async () => {
      jest.spyOn(service, 'getRate').mockResolvedValue(mockRate);
      
      const result = await service.convertCurrency('USD', 'EUR', 100);
      
      expect(result).toEqual({
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 100,
        toAmount: 100 * mockRate.rate,
        rate: mockRate.rate,
      });
    });

    it('should validate inputs', async () => {
      await expect(service.convertCurrency('', 'EUR', 100)).rejects.toThrow(BadRequestException);
      await expect(service.convertCurrency('USD', '', 100)).rejects.toThrow(BadRequestException);
      await expect(service.convertCurrency('USD', 'EUR', 0)).rejects.toThrow(BadRequestException);
      await expect(service.convertCurrency('USD', 'EUR', -1)).rejects.toThrow(BadRequestException);
    });
  });
}); 