import { Module } from '@nestjs/common';
import { UserAuthModule } from './user-auth.module';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UserAuthModule,
    SharedUtilsModule,
  ],
})
export class AppModule {}
