import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Order } from './entities/order.entity';
import { Transaction } from './entities/transaction.entity';
import { TransactionService } from './services/transaction.service';
import { TransactionController } from './controllers/transaction.controller';
import { DatabaseModule } from '@forex-marketplace/database';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';
import { MessageQueueModule } from '@forex-marketplace/message-queue';
import { JwtStrategy, AuthModule } from '@forex-marketplace/auth';
import { join } from 'path';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Order, Transaction]),
    SharedUtilsModule,
    AuthModule,
    ClientsModule.register([
      {
        name: 'RATE_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'rate',
          protoPath: join(
            __dirname,
            '../../../libs/grpc/src/lib/protos/rate.proto'
          ),
          url: process.env['RATE_GRPC_URL'] || 'localhost:5001',
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
          },
          maxSendMessageLength: 10 * 1024 * 1024, // 10MB
          maxReceiveMessageLength: 10 * 1024 * 1024, // 10MB
          channelOptions: {
            'grpc.keepalive_time_ms': 120000, // 2 minutes
            'grpc.keepalive_timeout_ms': 20000, // 20 seconds
            'grpc.keepalive_permit_without_calls': 1,
            'grpc.http2.min_time_between_pings_ms': 120000, // 2 minutes
            'grpc.http2.max_pings_without_data': 0,
          },
        },
      },
      {
        name: 'WALLET_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'wallet',
          protoPath: join(
            __dirname,
            '../../../apps/transaction-service/src/app/protos/wallet.proto'
          ),
          url: process.env['WALLET_GRPC_URL'] || 'localhost:5002',
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
          },
        },
      },
      {
        name: 'USER_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'user',
          protoPath: join(
            __dirname,
            '../../../apps/transaction-service/src/app/protos/user.proto'
          ),
          url: process.env['USER_GRPC_URL'] || 'localhost:5003',
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
          },
        },
      },
    ]),
    MessageQueueModule.register({
      name: 'NOTIFICATION_SERVICE',
      queue: 'notifications',
    }),
  ],
  controllers: [TransactionController],
  providers: [TransactionService, JwtStrategy],
  exports: [TransactionService],
})
export class TransactionModule {}
