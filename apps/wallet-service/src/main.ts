import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { ExceptionFilter } from '@forex-marketplace/shared-utils';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Setup gRPC microservice
  const grpcUrl = process.env.WALLET_GRPC_URL || `0.0.0.0:${process.env.WALLET_GRPC_PORT || 5002}`;
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'wallet',
      protoPath: join(
        __dirname,
        '../../../libs/grpc/src/lib/protos/wallet.proto'
      ),
      url: grpcUrl,
    },
  });

  // Start microservices
  await app.startAllMicroservices();
  Logger.log(`🚀 Wallet gRPC Service is running on: ${grpcUrl}`);

  const port = process.env.WALLET_PORT || 3002;
  await app.listen(port);

  Logger.log(
    `🚀 Wallet Service is running on: http://localhost:${port}/api/v1`
  );
}

bootstrap();
