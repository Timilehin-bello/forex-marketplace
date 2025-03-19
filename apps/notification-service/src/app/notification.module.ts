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

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Notification]),
    SharedUtilsModule,
    AuthModule,
  ],
  controllers: [NotificationController, NotificationConsumers],
  providers: [NotificationService, EmailService, JwtStrategy],
  exports: [NotificationService, EmailService],
})
export class NotificationModule {}
