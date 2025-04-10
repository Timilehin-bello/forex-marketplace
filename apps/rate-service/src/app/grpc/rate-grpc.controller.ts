import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RateService } from '../services/rate.service';
import { LoggerService } from '@forex-marketplace/shared-utils';

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

type EmptyRequest = Record<string, never>;

interface AllRatesResponse {
  rates: RateResponse[];
}

@Controller()
export class RateGrpcController {
  private readonly logger = new Logger(RateGrpcController.name);

  constructor(
    private readonly rateService: RateService,
    private readonly loggerService: LoggerService
  ) {
    this.loggerService.log('RateGrpcController initialized');
    this.logger.log('RateGrpcController initialized with NestJS Logger');
    this.logger.log('Available gRPC methods:');
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

      // Format timestamp safely whether it's a Date object or string
      const timestamp = rate.timestamp instanceof Date 
        ? rate.timestamp.toISOString() 
        : typeof rate.timestamp === 'string' 
          ? rate.timestamp 
          : new Date().toISOString();

      const response: RateResponse = {
        baseCurrency: rate.baseCurrency,
        targetCurrency: rate.targetCurrency,
        rate: rate.rate,
        timestamp: timestamp,
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

    
      throw new Error(error.message);
    }
  }

  @GrpcMethod('RateService', 'GetAllRates')
  async getAllRates(data: EmptyRequest): Promise<AllRatesResponse> {
    this.logger.log('gRPC GetAllRates called');
    this.loggerService.log('gRPC GetAllRates called');
    try {
      const paginatedRates = await this.rateService.getAllRates();

      const response: AllRatesResponse = {
        rates: paginatedRates.items.map((rate) => {
          // Format timestamp safely whether it's a Date object or string
          const timestamp = rate.timestamp instanceof Date 
            ? rate.timestamp.toISOString() 
            : typeof rate.timestamp === 'string' 
              ? rate.timestamp 
              : new Date().toISOString();
            
          return {
            baseCurrency: rate.baseCurrency,
            targetCurrency: rate.targetCurrency,
            rate: rate.rate,
            timestamp: timestamp,
          };
        }),
      };

      this.logger.log(`gRPC GetAllRates response with ${response.rates.length} rates`);
      this.loggerService.log(`gRPC GetAllRates response with ${response.rates.length} rates`);
      return response;
    } catch (error) {
      this.logger.error(`gRPC GetAllRates error: ${error.message}`, error.stack);
      this.loggerService.error(`gRPC GetAllRates error: ${error.message}`, error.stack);
      throw error;
    }
  }
}
