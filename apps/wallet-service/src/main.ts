import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  MicroserviceOptions,
  Transport,
  GrpcOptions,
} from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { ExceptionFilter } from '@forex-marketplace/shared-utils';
import { join } from 'path';
import { readFileSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const grpcUrl = process.env['GRPC_URL'] || 'localhost:5002';

  // Use the mounted volume path directly
  const protoPath = '/app/apps/transaction-service/src/app/protos/wallet.proto';

  Logger.log(`Setting up gRPC microservice with URL: ${grpcUrl}`);
  Logger.log(`Using proto file at: ${protoPath}`);

  try {
    // Set up gRPC microservice
    const grpcOptions: GrpcOptions = {
      transport: Transport.GRPC,
      options: {
        package: 'wallet',
        protoPath,
        url: grpcUrl,
        loader: {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
        maxSendMessageLength: 10 * 1024 * 1024, // 10MB
        maxReceiveMessageLength: 10 * 1024 * 1024, // 10MB
        channelOptions: {
          'grpc.keepalive_time_ms': 120000, // 2 minutes
          'grpc.keepalive_timeout_ms': 20000, // 20 seconds
          'grpc.keepalive_permit_without_calls': 1,
          'grpc.http2.min_time_between_pings_ms': 120000, // 2 minutes
          'grpc.http2.max_pings_without_data': 0,
        },
      },
    };

    Logger.log(`gRPC options: ${JSON.stringify(grpcOptions, null, 2)}`);
    app.connectMicroservice(grpcOptions);

    Logger.log('Successfully connected microservice');

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );

    // Global exception filter
    app.useGlobalFilters(new ExceptionFilter());

    // CORS
    app.enableCors();

    // Start microservices
    Logger.log('Starting gRPC microservices...');
    await app.startAllMicroservices();
    Logger.log('gRPC microservices started successfully');
    Logger.log(
      'Available gRPC methods: GetWalletByUserIdAndCurrency, ProcessTransaction, CreateWallet'
    );

    const port = process.env.PORT || 3002;
    await app.listen(port);

    Logger.log(
      `🚀 Wallet Service is running on: http://localhost:${port}/api/v1`
    );
    Logger.log(
      `🚀 Wallet gRPC Service is running on: ${
        process.env['GRPC_URL'] || 'localhost:5002'
      }`
    );
  } catch (error) {
    Logger.error(
      `Failed to start wallet service: ${error.message}`,
      error.stack
    );
    throw error;
  }
}

bootstrap();
