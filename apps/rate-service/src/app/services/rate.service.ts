import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForexRate } from '../entities/rate.entity';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { LoggerService } from '@forex-marketplace/shared-utils';

@Injectable()
export class RateService implements OnModuleInit {
  constructor(
    @InjectRepository(ForexRate)
    private readonly rateRepository: Repository<ForexRate>,
    private readonly httpService: HttpService,
    private readonly logger: LoggerService
  ) {}

  async onModuleInit() {
    // Fetch rates on service startup
    await this.fetchAndUpdateRates();
  }

  @Cron(CronExpression.EVERY_HOUR) // Update rates every hour
  async fetchAndUpdateRates() {
    try {
      this.logger.log('Fetching latest forex rates');

      const apiKey = process.env['EXCHANGE_RATE_API_KEY'] || 'your_api_key';
      this.logger.log('apikey: ' + apiKey);
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

      throw new Error(`Rate not found for ${baseCurrency}/${targetCurrency}`);
    }

    return rate;
  }

  async getAllRates(): Promise<ForexRate[]> {
    return this.rateRepository.find();
  }
}
