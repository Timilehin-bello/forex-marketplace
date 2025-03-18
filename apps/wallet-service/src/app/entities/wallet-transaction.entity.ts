import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IWalletTransaction } from '@forex-marketplace/shared-types';
import { Wallet } from './wallet.entity';

@Entity('wallet_transactions')
export class WalletTransaction implements IWalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column({
    type: 'enum',
    enum: ['CREDIT', 'DEBIT'],
  })
  type: 'CREDIT' | 'DEBIT';

  @Column('decimal', { precision: 20, scale: 8 })
  amount: number;

  @Column()
  description: string;

  @Column({ nullable: true })
  referenceId?: string;

  @CreateDateColumn()
  createdAt: Date;
}
