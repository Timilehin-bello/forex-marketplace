import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletService } from './services/wallet.service';
import { WalletController } from './controllers/wallet.controller';
import { WalletGrpcController } from './grpc/wallet-grpc.controller';
import { DatabaseModule } from '@forex-marketplace/database';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';
import { MessageQueueModule } from '@forex-marketplace/message-queue';
import { JwtStrategy, AuthModule } from '@forex-marketplace/auth';
import { GrpcModule } from '@forex-marketplace/grpc';
import { join } from 'path';
import { Global } from '@nestjs/common';

@Global()
@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Wallet, WalletTransaction]),
    SharedUtilsModule,
    AuthModule,
    // User Service
    GrpcModule.register({
      name: 'USER_SERVICE',
      protoPath: join(__dirname, '../../../libs/grpc/src/lib/protos/user.proto'),
      url: process.env.USER_GRPC_URL || 'localhost:5013',
      package: 'user',
    }),
    MessageQueueModule.register({
      name: 'NOTIFICATION_SERVICE',
      queue: 'notifications',
    }),
  ],
  controllers: [WalletController, WalletGrpcController],
  providers: [WalletService, JwtStrategy],
  exports: [WalletService],
})
export class WalletModule {}
