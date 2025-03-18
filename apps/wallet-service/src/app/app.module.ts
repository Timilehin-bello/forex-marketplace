import { Module } from '@nestjs/common';
import { WalletModule } from './wallet.module';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || 'supersecret',
      signOptions: { expiresIn: '7d' },
    }),
    WalletModule,
    SharedUtilsModule,
  ],
})
export class AppModule {}
