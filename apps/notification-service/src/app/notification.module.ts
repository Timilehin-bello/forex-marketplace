import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { NotificationController } from './controllers/notification.controller';
import { NotificationConsumers } from './consumers/notification.consumers';
import { DatabaseModule } from '@forex-marketplace/database';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';
import { JwtStrategy, AuthModule } from '@forex-marketplace/auth';
import { join } from 'path';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Notification]),
    SharedUtilsModule,
    AuthModule,
    ClientsModule.register([
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
  ],
  controllers: [NotificationController, NotificationConsumers],
  providers: [NotificationService, EmailService, JwtStrategy],
  exports: [NotificationService, EmailService],
})
export class NotificationModule {}
