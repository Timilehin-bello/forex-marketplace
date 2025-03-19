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
  const grpcUrl = process.env.GRPC_URL || '0.0.0.0:5003';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(
        __dirname,
        '../../../libs/grpc/src/lib/protos/user.proto'
      ),
      url: grpcUrl,
    },
  });

  // Start microservices
  await app.startAllMicroservices();
  Logger.log(`🚀 User Auth gRPC Service is running on: ${grpcUrl}`);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  Logger.log(
    `🚀 User Auth REST Service is running on: http://localhost:${port}/api/v1`
  );
}

bootstrap();
