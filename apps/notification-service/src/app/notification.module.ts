import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { NotificationController } from './controllers/notification.controller';
import { NotificationConsumers } from './consumers/notification.consumers';
import { DatabaseModule } from '@forex-marketplace/database';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';
import { JwtStrategy, AuthModule } from '@forex-marketplace/auth';
import { GrpcModule } from '@forex-marketplace/grpc';
import { join } from 'path';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Notification]),
    SharedUtilsModule,
    AuthModule,
    // User Service
    GrpcModule.register({
      name: 'USER_SERVICE',
      protoPath: join(__dirname, '../../../libs/grpc/src/lib/protos/user.proto'),
      url: process.env.USER_GRPC_URL || 'localhost:5013',
      package: 'user',
    }),
  ],
  controllers: [NotificationController, NotificationConsumers],
  providers: [NotificationService, EmailService, JwtStrategy],
  exports: [NotificationService, EmailService],
})
export class NotificationModule {}
