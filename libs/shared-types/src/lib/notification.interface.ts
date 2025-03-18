export enum NotificationType {
  TRANSACTION = 'TRANSACTION',
  ORDER = 'ORDER',
  WALLET = 'WALLET',
  SYSTEM = 'SYSTEM',
}

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}
