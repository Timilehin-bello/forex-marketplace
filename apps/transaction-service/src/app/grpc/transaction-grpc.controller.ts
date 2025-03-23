import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { TransactionService } from '../services/transaction.service';
import { LoggerService } from '@forex-marketplace/shared-utils';
import { OrderStatus } from '@forex-marketplace/shared-types';

interface GetOrderRequest {
  id: string;
}

interface GetUserOrdersRequest {
  userId: string;
  page?: number;
  limit?: number;
}

interface OrderResponse {
  id: string;
  userId: string;
  type: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface OrdersResponse {
  orders: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Controller()
export class TransactionGrpcController {
  private readonly logger = new Logger(TransactionGrpcController.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly loggerService: LoggerService
  ) {}

  @GrpcMethod('TransactionService', 'GetOrder')
  async getOrder(data: GetOrderRequest): Promise<OrderResponse> {
    this.logger.log(`gRPC GetOrder called with id: ${data.id}`);
    this.loggerService.log(`gRPC GetOrder called with id: ${data.id}`);
    
    try {
      const order = await this.transactionService.getOrderById(data.id);
      
      const response: OrderResponse = {
        id: order.id,
        userId: order.userId,
        type: order.type,
        fromCurrency: order.fromCurrency,
        toCurrency: order.toCurrency,
        fromAmount: order.fromAmount,
        toAmount: order.toAmount,
        rate: order.rate,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      };
      
      this.logger.log(`gRPC GetOrder response: ${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      this.logger.error(`gRPC GetOrder error: ${error.message}`, error.stack);
      this.loggerService.error(`gRPC GetOrder error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @GrpcMethod('TransactionService', 'GetUserOrders')
  async getUserOrders(data: GetUserOrdersRequest): Promise<OrdersResponse> {
    this.logger.log(`gRPC GetUserOrders called for userId: ${data.userId}`);
    this.loggerService.log(`gRPC GetUserOrders called for userId: ${data.userId}`);
    
    try {
      const page = data.page || 1;
      const limit = data.limit || 10;
      
      const result = await this.transactionService.getUserOrders(
        data.userId,
        page,
        limit
      );
      
      const response: OrdersResponse = {
        orders: result.items.map(order => ({
          id: order.id,
          userId: order.userId,
          type: order.type,
          fromCurrency: order.fromCurrency,
          toCurrency: order.toCurrency,
          fromAmount: order.fromAmount,
          toAmount: order.toAmount,
          rate: order.rate,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        })),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
      
      this.logger.log(`gRPC GetUserOrders response: ${result.items.length} orders found`);
      return response;
    } catch (error) {
      this.logger.error(`gRPC GetUserOrders error: ${error.message}`, error.stack);
      this.loggerService.error(`gRPC GetUserOrders error: ${error.message}`, error.stack);
      throw error;
    }
  }
} 