import { Controller, Get, Param } from '@nestjs/common';
import { RateService } from '../services/rate.service';

@Controller('rates')
export class RateController {
  constructor(private readonly rateService: RateService) {}

  @Get(':baseCurrency/:targetCurrency')
  async getRate(
    @Param('baseCurrency') baseCurrency: string,
    @Param('targetCurrency') targetCurrency: string
  ) {
    return this.rateService.getRate(baseCurrency, targetCurrency);
  }

  @Get()
  async getAllRates() {
    return this.rateService.getAllRates();
  }
}
