import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { ExceptionFilter } from '@forex-marketplace/shared-utils';

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

  const port = process.env.PORT || 3004;
  await app.listen(port);

  Logger.log(
    `🚀 Transaction Service is running on: http://localhost:${port}/api/v1`
  );
}

bootstrap();
