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
import { JwtStrategy } from '@forex-marketplace/auth';
import { join } from 'path';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Order, Transaction]),
    SharedUtilsModule,
    ClientsModule.register([
      {
        name: 'RATE_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'rate',
          protoPath: join(
            __dirname,
            '../../../../../libs/grpc/src/lib/protos/rate.proto'
          ),
          url: process.env['RATE_GRPC_URL'] || 'localhost:5000',
        },
      },
      {
        name: 'WALLET_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'wallet',
          protoPath: join(__dirname, './protos/wallet.proto'),
          url: process.env['WALLET_GRPC_URL'] || 'localhost:5001',
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
