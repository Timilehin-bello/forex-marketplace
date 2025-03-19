import { Injectable, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RateService } from '../services/rate.service';
import { LoggerService } from '@forex-marketplace/shared-utils';

// This matches the protobuf definition exactly
interface RateRequest {
  baseCurrency: string;
  targetCurrency: string;
}

interface RateResponse {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  timestamp: string;
}

interface AllRatesResponse {
  rates: RateResponse[];
}

@Injectable()
export class RateGrpcService {
  private readonly logger = new Logger(RateGrpcService.name);

  constructor(
    private readonly rateService: RateService,
    private readonly loggerService: LoggerService
  ) {
    this.loggerService.log('RateGrpcService initialized');
    this.logger.log('RateGrpcService initialized with NestJS Logger');
    this.logger.log('Available methods:');
    this.logger.log('- GetRate');
    this.logger.log('- GetAllRates');
  }

  @GrpcMethod('RateService', 'GetRate')
  async getRate(data: RateRequest): Promise<RateResponse> {
    this.logger.log(`gRPC GetRate called with data: ${JSON.stringify(data)}`);
    this.loggerService.log(
      `gRPC GetRate called with data: ${JSON.stringify(data)}`
    );
    try {
      const { baseCurrency, targetCurrency } = data;
      const rate = await this.rateService.getRate(baseCurrency, targetCurrency);

      const response: RateResponse = {
        baseCurrency: rate.baseCurrency,
        targetCurrency: rate.targetCurrency,
        rate: rate.rate,
        timestamp: rate.timestamp.toISOString(),
      };

      this.logger.log(`gRPC GetRate response: ${JSON.stringify(response)}`);
      this.loggerService.log(
        `gRPC GetRate response: ${JSON.stringify(response)}`
      );
      return response;
    } catch (error) {
      this.logger.error(`gRPC GetRate error: ${error.message}`, error.stack);
      this.loggerService.error(
        `gRPC GetRate error: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @GrpcMethod('RateService', 'GetAllRates')
  async getAllRates(): Promise<AllRatesResponse> {
    this.logger.log('gRPC GetAllRates called');
    this.loggerService.log('gRPC GetAllRates called');
    try {
      const paginatedRates = await this.rateService.getAllRates();

      const response: AllRatesResponse = {
        rates: paginatedRates.items.map((rate) => ({
          baseCurrency: rate.baseCurrency,
          targetCurrency: rate.targetCurrency,
          rate: rate.rate,
          timestamp: rate.timestamp.toISOString(),
        })),
      };

      this.logger.log(
        `gRPC GetAllRates response with ${response.rates.length} rates`
      );
      this.loggerService.log(
        `gRPC GetAllRates response with ${response.rates.length} rates`
      );
      return response;
    } catch (error) {
      this.logger.error(
        `gRPC GetAllRates error: ${error.message}`,
        error.stack
      );
      this.loggerService.error(
        `gRPC GetAllRates error: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
