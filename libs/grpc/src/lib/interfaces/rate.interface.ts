export interface RateRequest {
  baseCurrency: string;
  targetCurrency: string;
}

export interface RateResponse {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  timestamp: string;
}

export type EmptyRequest = object;

export interface AllRatesResponse {
  rates: RateResponse[];
}

export interface RateService {
  getRate(data: RateRequest): Promise<RateResponse>;
  getAllRates(data: EmptyRequest): Promise<AllRatesResponse>;
}
