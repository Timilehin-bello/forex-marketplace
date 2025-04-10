import { Module } from '@nestjs/common';
import { TransactionModule } from './transaction.module';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@forex-marketplace/auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || 'supersecret',
      signOptions: { expiresIn: '7d' },
    }),
    AuthModule,
    TransactionModule,
    SharedUtilsModule,
  ],
})
export class AppModule {}
