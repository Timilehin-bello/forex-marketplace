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
import { OrderStatus } from '@forex-marketplace/shared-types';
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

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
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
      } catch {
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

      // Get user email from user service
      let userEmail = '';
      try {
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
