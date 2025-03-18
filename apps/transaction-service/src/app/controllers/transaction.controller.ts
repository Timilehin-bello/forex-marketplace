import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TransactionService } from '../services/transaction.service';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { JwtAuthGuard } from '@forex-marketplace/auth';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('orders')
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.transactionService.createOrder(createOrderDto);
  }

  @Get('orders/:id')
  async getOrderById(@Param('id') id: string) {
    return this.transactionService.getOrderById(id);
  }

  @Get('user/:userId/orders')
  async getUserOrders(@Param('userId') userId: string) {
    return this.transactionService.getUserOrders(userId);
  }

  @Get('orders/:orderId/transactions')
  async getOrderTransactions(@Param('orderId') orderId: string) {
    return this.transactionService.getOrderTransactions(orderId);
  }
}
