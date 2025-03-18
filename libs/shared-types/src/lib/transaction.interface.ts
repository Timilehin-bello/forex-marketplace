export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum OrderType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export interface IOrder {
  id: string;
  userId: string;
  type: OrderType;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction {
  id: string;
  orderId: string;
  fromWalletId: string;
  toWalletId: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  createdAt: Date;
}
