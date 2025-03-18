import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { OrderType } from '@forex-marketplace/shared-types';

export class CreateOrderDto {
  @IsUUID()
  userId: string;

  @IsEnum(OrderType)
  type: OrderType;

  @IsString()
  @IsNotEmpty()
  fromCurrency: string;

  @IsString()
  @IsNotEmpty()
  toCurrency: string;

  @IsNumber()
  @IsPositive()
  fromAmount: number;
}
