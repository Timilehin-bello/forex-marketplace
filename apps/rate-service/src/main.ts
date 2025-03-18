import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { ExceptionFilter } from '@forex-marketplace/shared-utils';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set up gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'rate',
      protoPath: join(
        __dirname,
        '../../../libs/grpc/src/lib/protos/rate.proto'
      ),
      url: process.env['GRPC_URL'] || 'localhost:5001',
    },
  });

  // Global prefix for REST endpoints
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
  await app.startAllMicroservices();

  // Start HTTP server
  const port = process.env.PORT || 3003;
  await app.listen(port);

  Logger.log(`🚀 Rate Service is running on: http://localhost:${port}/api/v1`);
  Logger.log(
    `🚀 Rate gRPC Service is running on: ${
      process.env['GRPC_URL'] || 'localhost:5001'
    }`
  );
}

bootstrap();
