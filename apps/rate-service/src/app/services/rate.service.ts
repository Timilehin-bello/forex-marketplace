import { Injectable, OnModuleInit, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForexRate } from '../entities/rate.entity';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { LoggerService, CacheService } from '@forex-marketplace/shared-utils';
import {
  PaginatedResult,
  PaginationHelper,
} from '@forex-marketplace/shared-types';

@Injectable()
export class RateService implements OnModuleInit {
  private readonly logger = new Logger(RateService.name);
  private readonly CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    @InjectRepository(ForexRate)
    private readonly rateRepository: Repository<ForexRate>,
    private readonly httpService: HttpService,
    private readonly loggerService: LoggerService,
    private readonly cacheService: CacheService,
  ) {}

  async onModuleInit() {
    // Fetch rates on service startup
    await this.fetchAndUpdateRates();
  }

  @Cron(CronExpression.EVERY_HOUR) // Update rates every hour
  async fetchAndUpdateRates() {
    try {
      this.logger.log('Fetching latest forex rates');

      const apiKey = process.env['EXCHANGE_RATE_API_KEY'];
      if (!apiKey) {
        throw new BadRequestException('Exchange rate API key is not configured');
      }

      const baseCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];

      for (const baseCurrency of baseCurrencies) {
        await this.fetchRatesForBaseCurrency(baseCurrency, apiKey);
      }

      this.logger.log('Successfully updated forex rates');
    } catch (error) {
      this.logger.error(
        `Failed to fetch forex rates: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async fetchRatesForBaseCurrency(
    baseCurrency: string,
    apiKey: string
  ) {
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `Error fetching rates for ${baseCurrency}: ${error.message}`,
              error.stack
            );
            throw error;
          })
        )
      );

      if (data.result === 'success' && data.conversion_rates) {
        const timestamp = new Date(data.time_last_update_unix * 1000);
        const rates = data.conversion_rates;

        // Update rates in database
        const updates = Object.entries(rates).map(([targetCurrency, rate]) => {
          return this.upsertRate(
            baseCurrency,
            targetCurrency,
            Number(rate),
            timestamp
          );
        });

        await Promise.all(updates);
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch rates for ${baseCurrency}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async upsertRate(
    baseCurrency: string,
    targetCurrency: string,
    rate: number,
    timestamp: Date
  ) {
    const existingRate = await this.rateRepository.findOne({
      where: { baseCurrency, targetCurrency },
    });

    if (existingRate) {
      existingRate.rate = rate;
      existingRate.timestamp = timestamp;
      return this.rateRepository.save(existingRate);
    } else {
      const newRate = this.rateRepository.create({
        baseCurrency,
        targetCurrency,
        rate,
        timestamp,
      });
      return this.rateRepository.save(newRate);
    }
  }

  async getRate(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<ForexRate> {
    const cacheKey = `rate:${baseCurrency}:${targetCurrency}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        if (!baseCurrency || !targetCurrency) {
          throw new BadRequestException('Base and target currencies are required');
        }

        try {
          const rate = await this.rateRepository.findOne({
            where: { baseCurrency, targetCurrency },
          });

          if (!rate) {
            this.logger.warn(`Rate not found for ${baseCurrency}/${targetCurrency}`);

            // Try to calculate the rate using USD as intermediate
            if (baseCurrency !== 'USD' && targetCurrency !== 'USD') {
              const baseToUsd = await this.rateRepository.findOne({
                where: { baseCurrency: 'USD', targetCurrency: baseCurrency },
              });

              const usdToTarget = await this.rateRepository.findOne({
                where: { baseCurrency: 'USD', targetCurrency },
              });

              if (baseToUsd && usdToTarget) {
                const calculatedRate = (1 / baseToUsd.rate) * usdToTarget.rate;

                return this.rateRepository.create({
                  baseCurrency,
                  targetCurrency,
                  rate: calculatedRate,
                  timestamp: new Date(),
                });
              }
            }

            throw new NotFoundException(
              `Currency pair ${baseCurrency}/${targetCurrency} is not available for trading`
            );
          }

          return rate;
        } catch (error) {
          this.logger.error(
            `Error getting rate for ${baseCurrency}/${targetCurrency}: ${error.message}`,
            error.stack
          );
          throw error;
        }
      },
      this.CACHE_TTL
    );
  }

  async getAllRates(page = 1, limit = 10): Promise<PaginatedResult<ForexRate>> {
    try {
      const [items, total] = await this.rateRepository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        order: {
          baseCurrency: 'ASC',
          targetCurrency: 'ASC',
        },
      });

      return PaginationHelper.paginate(items, total, page, limit);
    } catch (error) {
      this.logger.error(
        `Error getting all rates: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async convertCurrency(
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): Promise<{
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    toAmount: number;
    rate: number;
  }> {
    if (!fromCurrency || !toCurrency) {
      throw new BadRequestException('From and to currencies are required');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const rate = await this.getRate(fromCurrency, toCurrency);
    const toAmount = amount * rate.rate;

    return {
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount,
      rate: rate.rate,
    };
  }

  async updateRate(fromCurrency: string, toCurrency: string, rate: number): Promise<ForexRate> {
    const existingRate = await this.rateRepository.findOne({
      where: {
        baseCurrency: fromCurrency,
        targetCurrency: toCurrency,
      },
    });

    if (existingRate) {
      existingRate.rate = rate;
      existingRate.timestamp = new Date();
      await this.rateRepository.save(existingRate);
      
      // Invalidate cache
      await this.cacheService.delete(`rate:${fromCurrency}:${toCurrency}`);
      return existingRate;
    }

    const newRate = this.rateRepository.create({
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
      rate,
      timestamp: new Date(),
    });

    await this.rateRepository.save(newRate);
    return newRate;
  }

  async deleteRate(fromCurrency: string, toCurrency: string): Promise<void> {
    const result = await this.rateRepository.delete({
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Rate not found for ${fromCurrency}/${toCurrency}`);
    }

    // Invalidate cache
    await this.cacheService.delete(`rate:${fromCurrency}:${toCurrency}`);
  }
}
