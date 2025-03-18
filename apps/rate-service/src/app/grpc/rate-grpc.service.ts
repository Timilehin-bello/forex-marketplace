import { Injectable } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RateService } from '../services/rate.service';
import { LoggerService } from '@forex-marketplace/shared-utils';

@Injectable()
export class RateGrpcService {
  constructor(
    private readonly rateService: RateService,
    private readonly logger: LoggerService
  ) {}

  @GrpcMethod('RateService', 'GetRate')
  async getRate(data: { baseCurrency: string; targetCurrency: string }) {
    try {
      const { baseCurrency, targetCurrency } = data;
      const rate = await this.rateService.getRate(baseCurrency, targetCurrency);

      return {
        baseCurrency: rate.baseCurrency,
        targetCurrency: rate.targetCurrency,
        rate: rate.rate,
        timestamp: rate.timestamp.toISOString(),
      };
    } catch (error) {
      this.logger.error(`gRPC GetRate error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @GrpcMethod('RateService', 'GetAllRates')
  async getAllRates() {
    try {
      const rates = await this.rateService.getAllRates();

      return {
        rates: rates.map((rate) => ({
          baseCurrency: rate.baseCurrency,
          targetCurrency: rate.targetCurrency,
          rate: rate.rate,
          timestamp: rate.timestamp.toISOString(),
        })),
      };
    } catch (error) {
      this.logger.error(
        `gRPC GetAllRates error: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
