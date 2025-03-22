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
    }),
    GrpcModule.register({
      name: 'WALLET_SERVICE',
      protoPath: join(__dirname, '../../../libs/grpc/src/lib/protos/wallet.proto'),
      url: process.env.WALLET_GRPC_URL || 'localhost:5002',
      package: 'wallet',
    }),
    GrpcModule.register({
      name: 'USER_SERVICE',
      protoPath: join(__dirname, '../../../libs/grpc/src/lib/protos/user.proto'),
      url: process.env.USER_GRPC_URL || 'localhost:5013',
      package: 'user',
    }),
  ],
  controllers: [TransactionController],
  providers: [TransactionService, JwtStrategy],
  exports: [TransactionService],
})
export class TransactionModule {}
