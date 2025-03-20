import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { RateService } from './rate.service';
import { ForexRate } from '../entities/rate.entity';
import { LoggerService } from '@forex-marketplace/shared-utils';
import { NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

describe('RateService', () => {
  let service: RateService;
  let rateRepository: jest.Mocked<Repository<ForexRate>>;
  let httpService: jest.Mocked<HttpService>;
  let loggerService: jest.Mocked<LoggerService>;

  const mockRate = {
    id: 'rate-id',
    baseCurrency: 'USD',
    targetCurrency: 'EUR',
    rate: 0.85,
    timestamp: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRatesResponse: AxiosResponse = {
    data: {
      success: true,
      base: 'USD',
      rates: {
        EUR: 0.85,
        GBP: 0.75,
        JPY: 110.5,
        CAD: 1.25,
      },
      timestamp: 1629380400,
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {
      url: 'https://api.exchangerate.host/latest',
    } as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateService,
        {
          provide: getRepositoryToken(ForexRate),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            upsert: jest.fn(),
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
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RateService>(RateService);
    rateRepository = module.get(getRepositoryToken(ForexRate)) as jest.Mocked<Repository<ForexRate>>;
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;

    // Mock process.env for API key
    process.env['EXCHANGE_RATE_API_KEY'] = 'test-api-key';
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRate', () => {
    it('should return a rate for given currencies', async () => {
      rateRepository.findOne.mockResolvedValue(mockRate);

      const result = await service.getRate('USD', 'EUR');

      expect(rateRepository.findOne).toHaveBeenCalledWith({
        where: {
          baseCurrency: 'USD',
          targetCurrency: 'EUR',
        },
      });
      expect(result).toEqual(mockRate);
    });

    it('should throw NotFoundException if rate not found', async () => {
      rateRepository.findOne.mockResolvedValue(null);

      await expect(service.getRate('USD', 'XYZ')).rejects.toThrow();
      expect(loggerService.warn).toHaveBeenCalled();
    });
  });

  describe('fetchAndUpdateRates', () => {
    beforeEach(() => {
      // Mock HttpService.get response
      httpService.get.mockImplementation((url) => {
        if (url.includes('base=USD')) {
          return of(mockRatesResponse);
        }
        // For other base currencies, return similar response with adjusted rates
        return of({
          ...mockRatesResponse,
          data: {
            ...mockRatesResponse.data,
            base: url.includes('base=EUR') ? 'EUR' : 'GBP',
          },
        });
      });

      // Mock repository create and save methods
      rateRepository.create.mockReturnValue(mockRate);
      rateRepository.save.mockResolvedValue(mockRate);
    });

    it('should fetch and update rates successfully', async () => {
      // Spy on the private method fetchRatesForBaseCurrency
      const fetchSpy = jest.spyOn<any, any>(service, 'fetchRatesForBaseCurrency').mockResolvedValue(undefined);

      await service.fetchAndUpdateRates();

      expect(fetchSpy).toHaveBeenCalledTimes(5); // Called for each base currency
      expect(loggerService.log).toHaveBeenCalledWith('Successfully updated forex rates');
    });

    it('should handle errors when fetching rates', async () => {
      // Make the HttpService.get throw an error
      httpService.get.mockImplementation(() =>
        throwError(() => new AxiosError('API Error', 'ERR_API'))
      );

      // Spy on the private method fetchRatesForBaseCurrency to let it pass through to the HTTP service
      jest.spyOn<any, any>(service, 'fetchRatesForBaseCurrency');

      await service.fetchAndUpdateRates();

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('getAllRates', () => {
    it('should return paginated rates', async () => {
      rateRepository.findAndCount.mockResolvedValue([[mockRate], 1]);

      const result = await service.getAllRates();

      expect(rateRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: {
          baseCurrency: 'ASC',
          targetCurrency: 'ASC',
        },
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
    });

    it('should return empty list when no rates are found', async () => {
      rateRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getAllRates();

      expect(result.items).toHaveLength(0);
      expect(result.total).toEqual(0);
    });
  });

  describe('convertCurrency', () => {
    it('should convert currency correctly', async () => {
      rateRepository.findOne.mockResolvedValue(mockRate);

      const result = await service.convertCurrency('USD', 'EUR', 100);

      expect(rateRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual({
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 100,
        toAmount: 85, // 100 * 0.85
        rate: 0.85,
      });
    });

    it('should throw NotFoundException if rate not found', async () => {
      rateRepository.findOne.mockResolvedValue(null);

      await expect(service.convertCurrency('USD', 'XYZ', 100)).rejects.toThrow();
      expect(loggerService.warn).toHaveBeenCalled();
    });
  });
}); 