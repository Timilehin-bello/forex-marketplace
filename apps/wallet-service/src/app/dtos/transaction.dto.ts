import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class WalletTransactionDto {
  @IsUUID()
  walletId: string;

  @IsEnum(['CREDIT', 'DEBIT'])
  type: 'CREDIT' | 'DEBIT';

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  referenceId?: string;
}
