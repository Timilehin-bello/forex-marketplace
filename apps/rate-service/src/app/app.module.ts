import { Module } from '@nestjs/common';
import { RateModule } from './rate.module';
import { ConfigModule } from '@nestjs/config';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RateModule,
    SharedUtilsModule,
  ],
})
export class AppModule {}
