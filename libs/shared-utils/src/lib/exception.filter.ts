import {
  ArgumentsHost,
  Catch,
  ExceptionFilter as NestExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { errorResponse } from './response/api-response.interface';

@Catch()
export class ExceptionFilter implements NestExceptionFilter {
  private readonly logger = new Logger(ExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message: string }).message || message;
    }

    const errorResponseObj = errorResponse(message, {
      statusCode: status,
      path: request.url,
      method: request.method,
    });

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : undefined
    );

    response.status(status).json(errorResponseObj);
  }
}
