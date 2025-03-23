import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TransactionController } from './controllers/transaction.controller';
import { TransactionService } from './services/transaction.service';
import { Transaction } from './entities/transaction.entity';
import { Order } from './entities/order.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule, JwtStrategy } from '@forex-marketplace/auth';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';
import { DatabaseModule } from '@forex-marketplace/database';
import { GrpcModule } from '@forex-marketplace/grpc';
import { join } from 'path';
import { MessageQueueModule } from '@forex-marketplace/message-queue';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Order]),
    DatabaseModule,
    AuthModule,
    SharedUtilsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule.forRoot(),
    MessageQueueModule.register({
      name: 'NOTIFICATION_SERVICE',
      queue: 'notifications',
    }),
    GrpcModule.register({
      name: 'RATE_SERVICE',
      protoPath: join(__dirname, '../../../libs/grpc/src/lib/protos/rate.proto'),
      url: process.env.RATE_GRPC_URL || 'localhost:5011',
      package: 'rate',
      channelOptions: {
        'grpc.keepalive_time_ms': 10000, // 10 seconds
        'grpc.keepalive_timeout_ms': 5000, // 5 seconds
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.max_reconnect_backoff_ms': 5000,
        'grpc.min_reconnect_backoff_ms': 1000,
        'grpc.service_config': JSON.stringify({
          methodConfig: [{
            name: [{ service: 'RateService' }],
            retryPolicy: {
              maxAttempts: 5,
              initialBackoff: '0.1s',
              maxBackoff: '1s',
              backoffMultiplier: 1.5,
              retryableStatusCodes: ['UNAVAILABLE', 'UNKNOWN'],
            },
          }],
        }),
      },
    }),
    GrpcModule.register({
      name: 'WALLET_SERVICE',
      protoPath: join(__dirname, '../../../libs/grpc/src/lib/protos/wallet.proto'),
      url: process.env.WALLET_GRPC_URL || 'localhost:5002',
      package: 'wallet',
      channelOptions: {
        'grpc.keepalive_time_ms': 10000, // 10 seconds
        'grpc.keepalive_timeout_ms': 5000, // 5 seconds
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.max_reconnect_backoff_ms': 5000,
        'grpc.min_reconnect_backoff_ms': 1000,
        'grpc.service_config': JSON.stringify({
          methodConfig: [{
            name: [{ service: 'WalletService' }],
            retryPolicy: {
              maxAttempts: 5,
              initialBackoff: '0.1s',
              maxBackoff: '1s',
              backoffMultiplier: 1.5,
              retryableStatusCodes: ['UNAVAILABLE', 'UNKNOWN'],
            },
          }],
        }),
      },
    }),
    GrpcModule.register({
      name: 'USER_SERVICE',
      protoPath: join(__dirname, '../../../libs/grpc/src/lib/protos/user.proto'),
      url: process.env.USER_GRPC_URL || 'localhost:5013',
      package: 'user',
      channelOptions: {
        'grpc.keepalive_time_ms': 10000, // 10 seconds
        'grpc.keepalive_timeout_ms': 5000, // 5 seconds
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.max_reconnect_backoff_ms': 5000,
        'grpc.min_reconnect_backoff_ms': 1000,
        'grpc.service_config': JSON.stringify({
          methodConfig: [{
            name: [{ service: 'UserService' }],
            retryPolicy: {
              maxAttempts: 5,
              initialBackoff: '0.1s',
              maxBackoff: '1s',
              backoffMultiplier: 1.5,
              retryableStatusCodes: ['UNAVAILABLE', 'UNKNOWN'],
            },
          }],
        }),
      },
    }),
  ],
  controllers: [TransactionController],
  providers: [TransactionService, JwtStrategy],
  exports: [TransactionService],
})
export class TransactionModule {}
