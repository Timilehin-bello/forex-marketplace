export interface IForexRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  timestamp: Date;
}
