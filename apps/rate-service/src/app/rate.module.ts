import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ForexRate } from './entities/rate.entity';
import { RateService } from './services/rate.service';
import { RateController } from './controllers/rate.controller';
import { RateGrpcService } from './grpc/rate-grpc.service';
import { DatabaseModule } from '@forex-marketplace/database';
import { SharedUtilsModule } from '@forex-marketplace/shared-utils';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([ForexRate]),
    HttpModule,
    ScheduleModule.forRoot(),
    SharedUtilsModule,
  ],
  controllers: [RateController],
  providers: [RateService, RateGrpcService],
  exports: [RateService],
})
export class RateModule {}
