import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ITransaction } from '@forex-marketplace/shared-types';
import { Order } from './order.entity';

@Entity('transactions')
export class Transaction implements ITransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  fromWalletId: string;

  @Column()
  toWalletId: string;

  @Column('decimal', { precision: 20, scale: 8 })
  fromAmount: number;

  @Column('decimal', { precision: 20, scale: 8 })
  toAmount: number;

  @Column('decimal', { precision: 20, scale: 10 })
  rate: number;

  @CreateDateColumn()
  createdAt: Date;
}
