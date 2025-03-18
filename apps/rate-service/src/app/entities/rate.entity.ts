import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IForexRate } from '@forex-marketplace/shared-types';

@Entity('forex_rates')
@Index(['baseCurrency', 'targetCurrency'], { unique: true })
export class ForexRate implements IForexRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  baseCurrency: string;

  @Column()
  targetCurrency: string;

  @Column('decimal', { precision: 20, scale: 10 })
  rate: number;

  @Column()
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
