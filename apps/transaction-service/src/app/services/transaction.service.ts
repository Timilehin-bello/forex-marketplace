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
import { LoggerService, CacheService } from '@forex-marketplace/shared-utils';
import {
  OrderStatus,
  PaginatedResult,
  PaginationHelper,
} from '@forex-marketplace/shared-types';
import {
  NotificationPattern,
  TransactionNotificationEvent,
  OrderNotificationEvent,
} from '@forex-marketplace/message-queue';

// Define interfaces for gRPC services with Observable return types
interface RateRequest {
  baseCurrency: string;
  targetCurrency: string;
}

interface RateResponse {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  timestamp: string;
}

type EmptyRequest = Record<string, never>;

interface AllRatesResponse {
  rates: RateResponse[];
}

interface RateService {
  getRate(data: RateRequest): Observable<RateResponse>;
  getAllRates(data: EmptyRequest): Observable<AllRatesResponse>;
}

interface WalletService {
  getWalletByUserIdAndCurrency(data: {
    userId: string;
    currency: string;
  }): Observable<{ id: string; balance: number; currency: string }>;
  processTransaction(data: {
    walletId: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    description: string;
    referenceId: string;
  }): Observable<{ success: boolean; transactionId: string }>;
  createWallet(data: {
    userId: string;
    currency: string;
  }): Observable<{ walletId: string; currency: string }>;
}

interface UserService {
  getUserById(data: { id: string }): Observable<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

@Injectable()
export class TransactionService implements OnModuleInit {
  private rateService: RateService;
  private walletServiceClient: WalletService;
  private userServiceClient: UserService;
  private readonly ORDER_CACHE_TTL = 600; // 10 minutes
  private readonly USER_ORDERS_CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService,
    @Inject('RATE_SERVICE') private readonly rateClient: ClientGrpc,
    @Inject('WALLET_SERVICE') private readonly walletClient: ClientGrpc,
    @Inject('USER_SERVICE') private readonly userClient: ClientGrpc,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy
  ) {}

  onModuleInit() {
    this.rateService = this.rateClient.getService<RateService>('RateService');
    this.walletServiceClient =
      this.walletClient.getService<WalletService>('WalletService');
    this.userServiceClient =
      this.userClient.getService<UserService>('UserService');
    this.logger.log('gRPC clients initialized');
    this.logger.log(`Rate service client: ${typeof this.rateService}`);
    this.logger.log(
      `Wallet service client: ${typeof this.walletServiceClient}`
    );
    this.logger.log(`User service client: ${typeof this.userServiceClient}`);
  }

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const { userId, type, fromCurrency, toCurrency, fromAmount } =
      createOrderDto;

    this.logger.log(`Creating order: ${JSON.stringify(createOrderDto)}`);

    try {
      // Get current exchange rate
      this.logger.log(
        `Getting rate for ${fromCurrency}/${toCurrency} via gRPC`
      );
      let rateData;
      try {
        rateData = await firstValueFrom(
          this.rateService.getRate({
            baseCurrency: fromCurrency,
            targetCurrency: toCurrency,
          })
        );
      } catch (rateError) {
        this.logger.error(
          `Failed to get rate for ${fromCurrency}/${toCurrency}: ${rateError.message}`
        );
        throw new BadRequestException(
          `Currency pair ${fromCurrency}/${toCurrency} is not available for trading`
        );
      }

      if (!rateData || !rateData.rate) {
        this.logger.error(
          `Invalid rate data for ${fromCurrency}/${toCurrency}`
        );
        throw new BadRequestException(
          `Currency pair ${fromCurrency}/${toCurrency} is not available for trading`
        );
      }

      // Safely convert the rate to a number if it's a string
      const rate = typeof rateData.rate === 'string' 
        ? parseFloat(rateData.rate) 
        : rateData.rate;

      this.logger.log(
        `Received rate: ${rate} for ${fromCurrency}/${toCurrency}`
      );
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

      // Invalidate user orders cache
      await this.cacheService.delete(`user_orders:${userId}`);
      
      return this.getOrderById(savedOrder.id);
    } catch (error) {
      this.logger.error(`Error creating order: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getOrderById(id: string): Promise<Order> {
    const cacheKey = `order:${id}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const order = await this.orderRepository.findOne({ where: { id } });
          if (!order) {
            this.logger.error(`Order with id ${id} not found`);
            throw new NotFoundException('Order not found');
          }
          return order;
        } catch (error) {
          this.logger.error(`Error getting order ${id}: ${error.message}`, error.stack);
          throw error;
        }
      },
      this.ORDER_CACHE_TTL
    );
  }

  async getUserOrders(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResult<Order>> {
    const cacheKey = `user_orders:${userId}:${page}:${limit}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [items, total] = await this.orderRepository.findAndCount({
          where: { userId },
          skip: (page - 1) * limit,
          take: limit,
          order: { createdAt: 'DESC' },
        });

        return PaginationHelper.paginate(items, total, page, limit);
      },
      this.USER_ORDERS_CACHE_TTL
    );
  }

  async getOrderTransactions(
    orderId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResult<Transaction>> {
    const cacheKey = `order_transactions:${orderId}:${page}:${limit}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [items, total] = await this.transactionRepository.findAndCount({
          where: { orderId },
          skip: (page - 1) * limit,
          take: limit,
          order: { createdAt: 'DESC' },
        });

        return PaginationHelper.paginate(items, total, page, limit);
      },
      this.ORDER_CACHE_TTL
    );
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

      // Find user's wallets with better error handling
      let fromWallet;
      try {
        this.logger.log(`Getting source wallet for userId: ${order.userId}, currency: ${order.fromCurrency}`);
        fromWallet = await firstValueFrom(
          this.walletServiceClient.getWalletByUserIdAndCurrency({
            userId: order.userId,
            currency: order.fromCurrency,
          })
        );
        this.logger.log(`Successfully retrieved source wallet: ${JSON.stringify(fromWallet)}`);
      } catch (error) {
        this.logger.log(`Source wallet not found, attempting to create one: ${error.message}`);
        // Create the wallet if it doesn't exist
        try {
          fromWallet = await firstValueFrom(
            this.walletServiceClient.createWallet({
              userId: order.userId,
              currency: order.fromCurrency,
            })
          );
          this.logger.log(`Successfully created source wallet: ${JSON.stringify(fromWallet)}`);
        } catch (createError) {
          this.logger.error(`Failed to create source wallet: ${createError.message}`, createError.stack);
          throw new BadRequestException(
            `Failed to create wallet for ${order.fromCurrency}: ${createError.message}`
          );
        }
      }

      if (!fromWallet) {
        order.status = OrderStatus.FAILED;
        await queryRunner.manager.save(order);
        throw new BadRequestException(
          `Failed to get or create wallet for ${order.fromCurrency}`
        );
      }

      // Find or create destination wallet with better error handling
      let toWallet;
      try {
        this.logger.log(`Getting destination wallet for userId: ${order.userId}, currency: ${order.toCurrency}`);
        toWallet = await firstValueFrom(
          this.walletServiceClient.getWalletByUserIdAndCurrency({
            userId: order.userId,
            currency: order.toCurrency,
          })
        );
        this.logger.log(`Successfully retrieved destination wallet: ${JSON.stringify(toWallet)}`);
      } catch (error) {
        this.logger.log(`Destination wallet not found, attempting to create one: ${error.message}`);
        // Create the wallet if it doesn't exist
        try {
          toWallet = await firstValueFrom(
            this.walletServiceClient.createWallet({
              userId: order.userId,
              currency: order.toCurrency,
            })
          );
          this.logger.log(`Successfully created destination wallet: ${JSON.stringify(toWallet)}`);
        } catch (createError) {
          this.logger.error(`Failed to create destination wallet: ${createError.message}`, createError.stack);
          throw new BadRequestException(
            `Failed to create wallet for ${order.toCurrency}: ${createError.message}`
          );
        }
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
      try {
        this.logger.log(`Processing debit transaction from wallet ${fromWallet.id}`);
        await firstValueFrom(
          this.walletServiceClient.processTransaction({
            walletId: fromWallet.id,
            type: 'DEBIT',
            amount: order.fromAmount,
            description: `Forex order: ${order.fromCurrency} to ${order.toCurrency}`,
            referenceId: order.id,
          })
        );
        this.logger.log(`Successfully processed debit transaction`);
      } catch (debitError) {
        this.logger.error(`Failed to process debit transaction: ${debitError.message}`, debitError.stack);
        throw new BadRequestException(
          `Failed to process debit transaction: ${debitError.message}`
        );
      }

      // Process credit to destination wallet
      try {
        this.logger.log(`Processing credit transaction to wallet ${toWallet.id}`);
        await firstValueFrom(
          this.walletServiceClient.processTransaction({
            walletId: toWallet.id,
            type: 'CREDIT',
            amount: order.toAmount,
            description: `Forex order: ${order.fromCurrency} to ${order.toCurrency}`,
            referenceId: order.id,
          })
        );
        this.logger.log(`Successfully processed credit transaction`);
      } catch (creditError) {
        this.logger.error(`Failed to process credit transaction: ${creditError.message}`, creditError.stack);
        throw new BadRequestException(
          `Failed to process credit transaction: ${creditError.message}`
        );
      }

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

      // Get user email from user service
      let userEmail = '';
      try {
        this.logger.log(`Getting user details for userId: ${order.userId}`);
        const userResponse = await firstValueFrom(
          this.userServiceClient.getUserById({ id: order.userId })
        );
        userEmail = userResponse.email;
        this.logger.log(
          `Found user email: ${userEmail} for user ID: ${order.userId}`
        );
      } catch (error) {
        this.logger.error(
          `Error fetching user email: ${error.message}`,
          error.stack
        );
      }

      // Send notifications
      this.notificationClient.emit(
        NotificationPattern.SEND_TRANSACTION_NOTIFICATION,
        new TransactionNotificationEvent(
          order.userId,
          transaction.id,
          order.fromAmount,
          order.fromCurrency,
          'DEBIT',
          userEmail, // Now using the fetched email
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
          userEmail, // Now using the fetched email
          {
            fromAmount: order.fromAmount,
            toAmount: order.toAmount,
            rate: order.rate,
          }
        )
      );

      // After completing order processing, invalidate order cache
      await this.cacheService.delete(`order:${orderId}`);
      
      // Also invalidate user orders cache
      if (order && order.userId) {
        await this.cacheService.invalidatePattern(`user_orders:${order.userId}:*`);
      }
    } catch (error) {
      // Rollback in case of error
      await queryRunner.rollbackTransaction();
      
      this.logger.error(`Error processing order ${orderId}: ${error.message}`, error.stack);

      // Update order status to FAILED if we couldn't handle in the catch block above
      try {
        const order = await this.orderRepository.findOne({
          where: { id: orderId },
        });
        if (order && order.status === OrderStatus.PENDING) {
          this.logger.log(`Updating order ${orderId} status to FAILED`);
          order.status = OrderStatus.FAILED;
          await this.orderRepository.save(order);

          // Get user email from user service
          let userEmail = '';
          try {
            const userResponse = await firstValueFrom(
              this.userServiceClient.getUserById({ id: order.userId })
            );
            userEmail = userResponse.email;
          } catch (emailError) {
            this.logger.error(
              `Error fetching user email: ${emailError.message}`,
              emailError.stack
            );
          }

          // Prepare error message for notification
          let errorMessage = error.message;
          if (
            error.message.includes('Rate not found') ||
            error.message.includes('currency pair') ||
            error.message.includes('not available for trading')
          ) {
            errorMessage = `Currency pair ${order.fromCurrency}/${order.toCurrency} is not available for trading`;
          } else if (error.message.includes('UNKNOWN')) {
            errorMessage = 'Communication error with service. Please try again later.';
          }

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
              userEmail, // Now using the fetched email
              {
                error: errorMessage,
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

      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }
}
