import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs'; // Add Observable import
import { Order } from '../entities/order.entity';
import { Transaction } from '../entities/transaction.entity';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { LoggerService } from '@forex-marketplace/shared-utils';
import { OrderStatus, OrderType } from '@forex-marketplace/shared-types';
import {
  NotificationPattern,
  TransactionNotificationEvent,
  OrderNotificationEvent,
} from '@forex-marketplace/message-queue';

// Define interfaces for gRPC services with Observable return types
interface RateService {
  getRate(data: {
    baseCurrency: string;
    targetCurrency: string;
  }): Observable<any>;
  getAllRates(data: object): Observable<any>;
}

interface WalletService {
  getWalletByUserIdAndCurrency(data: {
    userId: string;
    currency: string;
  }): Observable<any>;
  processTransaction(data: any): Observable<any>;
  createWallet(data: { userId: string; currency: string }): Observable<any>;
}

@Injectable()
export class TransactionService implements OnModuleInit {
  private rateService: RateService;
  private walletServiceClient: WalletService;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    @Inject('RATE_SERVICE') private readonly rateClient: ClientGrpc,
    @Inject('WALLET_SERVICE') private readonly walletClient: ClientGrpc,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy
  ) {}

  onModuleInit() {
    this.rateService = this.rateClient.getService<RateService>('RateService');
    this.walletServiceClient =
      this.walletClient.getService<WalletService>('WalletService');
  }

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const { userId, type, fromCurrency, toCurrency, fromAmount } =
      createOrderDto;

    try {
      // Get current exchange rate
      const rateData = await firstValueFrom(
        this.rateService.getRate({
          baseCurrency: fromCurrency,
          targetCurrency: toCurrency,
        })
      );

      if (!rateData || !rateData.rate) {
        this.logger.error(
          `Failed to get rate for ${fromCurrency}/${toCurrency}`
        );
        throw new BadRequestException(
          `Failed to get rate for ${fromCurrency}/${toCurrency}`
        );
      }

      const rate = rateData.rate;
      const toAmount = fromAmount * rate;

      // Create order
      const order = this.orderRepository.create({
        userId,
        type,
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount,
        rate,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await this.orderRepository.save(order);

      // Process the order immediately
      await this.processOrder(savedOrder.id);

      return this.getOrderById(savedOrder.id);
    } catch (error) {
      this.logger.error(`Error creating order: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getOrderById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      this.logger.error(`Order with id ${id} not found`);
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getOrderTransactions(orderId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { orderId },
      relations: ['order'],
    });
  }

  private async processOrder(orderId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get the order with lock
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Order with ID ${orderId} is already ${order.status}`
        );
      }

      // Find user's wallets
      const fromWallet = await firstValueFrom(
        this.walletServiceClient.getWalletByUserIdAndCurrency({
          userId: order.userId,
          currency: order.fromCurrency,
        })
      );

      if (!fromWallet) {
        order.status = OrderStatus.FAILED;
        await queryRunner.manager.save(order);
        throw new BadRequestException(
          `Wallet for ${order.fromCurrency} not found`
        );
      }

      // Find or create destination wallet
      let toWallet;
      try {
        toWallet = await firstValueFrom(
          this.walletServiceClient.getWalletByUserIdAndCurrency({
            userId: order.userId,
            currency: order.toCurrency,
          })
        );
      } catch (error) {
        // Create the wallet if it doesn't exist
        toWallet = await firstValueFrom(
          this.walletServiceClient.createWallet({
            userId: order.userId,
            currency: order.toCurrency,
          })
        );
      }
      if (!toWallet) {
        order.status = OrderStatus.FAILED;
        await queryRunner.manager.save(order);
        throw new BadRequestException(
          `Failed to get or create wallet for ${order.toCurrency}`
        );
      }

      // Check if user has enough funds
      if (fromWallet.balance < order.fromAmount) {
        order.status = OrderStatus.FAILED;
        await queryRunner.manager.save(order);
        throw new BadRequestException('Insufficient funds');
      }

      // Process debit from source wallet
      await firstValueFrom(
        this.walletServiceClient.processTransaction({
          walletId: fromWallet.id,
          type: 'DEBIT',
          amount: order.fromAmount,
          description: `Forex order: ${order.fromCurrency} to ${order.toCurrency}`,
          referenceId: order.id,
        })
      );

      // Process credit to destination wallet
      await firstValueFrom(
        this.walletServiceClient.processTransaction({
          walletId: toWallet.id,
          type: 'CREDIT',
          amount: order.toAmount,
          description: `Forex order: ${order.fromCurrency} to ${order.toCurrency}`,
          referenceId: order.id,
        })
      );

      // Create transaction record
      const transaction = this.transactionRepository.create({
        orderId: order.id,
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        fromAmount: order.fromAmount,
        toAmount: order.toAmount,
        rate: order.rate,
      });

      await queryRunner.manager.save(transaction);

      // Update order status
      order.status = OrderStatus.COMPLETED;
      await queryRunner.manager.save(order);

      // Commit the transaction
      await queryRunner.commitTransaction();

      // Send notifications
      this.notificationClient.emit(
        NotificationPattern.SEND_TRANSACTION_NOTIFICATION,
        new TransactionNotificationEvent(
          order.userId,
          transaction.id,
          order.fromAmount,
          order.fromCurrency,
          'DEBIT',
          '', // Email should be fetched from user service in a real implementation
          {
            orderId: order.id,
            fromCurrency: order.fromCurrency,
            toCurrency: order.toCurrency,
            fromAmount: order.fromAmount,
            toAmount: order.toAmount,
          }
        )
      );

      this.notificationClient.emit(
        NotificationPattern.SEND_ORDER_NOTIFICATION,
        new OrderNotificationEvent(
          order.userId,
          order.id,
          OrderStatus.COMPLETED,
          order.type,
          order.fromCurrency,
          order.toCurrency,
          '', // Email should be fetched from user service in a real implementation
          {
            fromAmount: order.fromAmount,
            toAmount: order.toAmount,
            rate: order.rate,
          }
        )
      );
    } catch (error) {
      // Rollback in case of error
      await queryRunner.rollbackTransaction();

      // Update order status to FAILED if we couldn't handle in the catch block above
      try {
        const order = await this.orderRepository.findOne({
          where: { id: orderId },
        });
        if (order && order.status === OrderStatus.PENDING) {
          order.status = OrderStatus.FAILED;
          await this.orderRepository.save(order);

          // Send failure notification
          this.notificationClient.emit(
            NotificationPattern.SEND_ORDER_NOTIFICATION,
            new OrderNotificationEvent(
              order.userId,
              order.id,
              OrderStatus.FAILED,
              order.type,
              order.fromCurrency,
              order.toCurrency,
              '', // Email should be fetched from user service in a real implementation
              {
                error: error.message,
              }
            )
          );
        }
      } catch (updateError) {
        this.logger.error(
          `Failed to update order status: ${updateError.message}`,
          updateError.stack
        );
      }

      this.logger.error(
        `Error processing order: ${error.message}`,
        error.stack
      );
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }
}
