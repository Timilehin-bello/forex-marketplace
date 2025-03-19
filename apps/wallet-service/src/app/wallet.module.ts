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

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Wallet, WalletTransaction]),
    SharedUtilsModule,
    AuthModule,
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
