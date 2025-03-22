import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport, GrpcOptions } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { ExceptionFilter } from '@forex-marketplace/shared-utils';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Connect to RabbitMQ
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env['RABBITMQ_URL'] || 'amqp://localhost:5672'],
      queue: 'notifications',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Connect gRPC microservice if needed
  if (process.env.NOTIFICATION_GRPC_PORT) {
    const grpcUrl = `0.0.0.0:${process.env.NOTIFICATION_GRPC_PORT || 5006}`;
    const grpcOptions: GrpcOptions = {
      transport: Transport.GRPC,
      options: {
        package: 'notification',
        protoPath: join(__dirname, '../../../libs/grpc/src/lib/protos/notification.proto'),
        url: grpcUrl,
      },
    };
    app.connectMicroservice<MicroserviceOptions>(grpcOptions);
    Logger.log(`gRPC microservice configured at ${grpcUrl}`);
  }

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
  await app.startAllMicroservices();

  // Start HTTP server
  const port = process.env.NOTIFICATION_PORT || 3006;
  await app.listen(port);

  Logger.log(
    `🚀 Notification Service is running on: http://localhost:${port}/api/v1`
  );
  Logger.log(
    `🚀 Notification Consumer is listening to RabbitMQ queue: notifications`
  );
}

bootstrap();
