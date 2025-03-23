import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerService } from './logger.service';
import { CacheService } from './cache.service';
import { ResponseInterceptor } from './response/response.interceptor';

@Global()
@Module({
  providers: [
    LoggerService,
    CacheService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
  exports: [LoggerService, CacheService],
})
export class SharedUtilsModule {}
