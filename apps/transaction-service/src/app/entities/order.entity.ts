import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  IOrder,
  OrderStatus,
  OrderType,
} from '@forex-marketplace/shared-types';

@Entity('orders')
export class Order implements IOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: OrderType,
  })
  type: OrderType;

  @Column()
  fromCurrency: string;

  @Column()
  toCurrency: string;

  @Column('decimal', { precision: 20, scale: 8 })
  fromAmount: number;

  @Column('decimal', { precision: 20, scale: 8 })
  toAmount: number;

  @Column('decimal', { precision: 20, scale: 10 })
  rate: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
