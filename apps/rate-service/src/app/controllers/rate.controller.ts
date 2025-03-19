import {
  Controller,
  Get,
  Param,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { RateService } from '../services/rate.service';
import { ApiResponse, successResponse } from '@forex-marketplace/shared-utils';
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
  async getAllRates(): Promise<ApiResponse<ForexRate[]>> {
    const rates = await this.rateService.getAllRates();
    return successResponse(rates);
  }
}
