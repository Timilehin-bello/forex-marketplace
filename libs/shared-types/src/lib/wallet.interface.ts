export interface IWallet {
  id: string;
  userId: string;
  currency: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletTransaction {
  id: string;
  walletId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  referenceId?: string;
  createdAt: Date;
}
