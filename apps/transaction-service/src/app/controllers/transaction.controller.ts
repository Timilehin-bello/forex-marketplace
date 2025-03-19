import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionService } from '../services/transaction.service';
import { CreateOrderDto } from '../dtos/create-order.dto';
import {
  JwtAuthGuard,
  CurrentUser,
  AuthorizationService,
} from '@forex-marketplace/auth';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly authService: AuthorizationService
  ) {}

  @Post('orders')
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user
  ) {
    // Ensure the order is created for the current user
    createOrderDto.userId = user.id;
    return this.transactionService.createOrder(createOrderDto);
  }

  @Get('orders/:id')
  async getOrderById(@Param('id') id: string, @CurrentUser() user) {
    const order = await this.transactionService.getOrderById(id);

    // Check if the order belongs to the current user
    if (order) {
      this.authService.ensureOwnerOrAdmin(
        order.userId,
        user,
        'You are not authorized to access this order'
      );
    }

    return order;
  }

  @Get('user/:userId/orders')
  async getUserOrders(@Param('userId') userId: string, @CurrentUser() user) {
    // Only allow users to access their own orders unless they're an admin
    this.authService.ensureOwnerOrAdmin(
      userId,
      user,
      'You are not authorized to access orders for this user'
    );

    return this.transactionService.getUserOrders(userId);
  }

  @Get('orders/:orderId/transactions')
  async getOrderTransactions(
    @Param('orderId') orderId: string,
    @CurrentUser() user
  ) {
    // First verify the order belongs to the current user
    const order = await this.transactionService.getOrderById(orderId);

    if (order) {
      this.authService.ensureOwnerOrAdmin(
        order.userId,
        user,
        'You are not authorized to access transactions for this order'
      );
    }

    return this.transactionService.getOrderTransactions(orderId);
  }
}
