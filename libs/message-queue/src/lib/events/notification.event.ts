export enum NotificationPattern {
  SEND_TRANSACTION_NOTIFICATION = 'send-transaction-notification',
  SEND_ORDER_NOTIFICATION = 'send-order-notification',
  SEND_WALLET_NOTIFICATION = 'send-wallet-notification',
}

export class TransactionNotificationEvent {
  constructor(
    public readonly userId: string,
    public readonly transactionId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly type: 'CREDIT' | 'DEBIT',
    public readonly email: string,
    public readonly metadata?: Record<string, any>
  ) {}
}

export class OrderNotificationEvent {
  constructor(
    public readonly userId: string,
    public readonly orderId: string,
    public readonly status: string,
    public readonly type: string,
    public readonly fromCurrency: string,
    public readonly toCurrency: string,
    public readonly email: string,
    public readonly metadata?: Record<string, any>
  ) {}
}

export class WalletNotificationEvent {
  constructor(
    public readonly userId: string,
    public readonly walletId: string,
    public readonly currency: string,
    public readonly action: string,
    public readonly email: string,
    public readonly metadata?: Record<string, any>
  ) {}
}
