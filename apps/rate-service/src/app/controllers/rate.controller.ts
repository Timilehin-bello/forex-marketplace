import {
  Controller,
  Get,
  Param,
  HttpStatus,
  HttpException,
  Query,
} from '@nestjs/common';
import { RateService } from '../services/rate.service';
import { ApiResponse, successResponse } from '@forex-marketplace/shared-utils';
import { PaginatedResult } from '@forex-marketplace/shared-types';
import { ForexRate } from '../entities/rate.entity';

@Controller('rates')
export class RateController {
  constructor(private readonly rateService: RateService) {}

  @Get(':baseCurrency/:targetCurrency')
  async getRate(
    @Param('baseCurrency') baseCurrency: string,
    @Param('targetCurrency') targetCurrency: string
  ): Promise<ApiResponse<ForexRate>> {
    try {
      const rate = await this.rateService.getRate(baseCurrency, targetCurrency);
      return successResponse(rate);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get()
  async getAllRates(
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<ApiResponse<PaginatedResult<ForexRate>>> {
    const rates = await this.rateService.getAllRates(
      page ? parseInt(String(page)) : 1,
      limit ? parseInt(String(limit)) : 10
    );
    return successResponse(rates);
  }
}
