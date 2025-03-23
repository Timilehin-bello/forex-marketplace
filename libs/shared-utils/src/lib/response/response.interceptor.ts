import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  ApiResponse,
  successResponse,
  errorResponse,
  ErrorMeta,
} from './api-response.interface';

/**
 * Interceptor that transforms all responses to a standardized format
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      // Transform successful responses
      map((data) => {
        // If the response is already in our ApiResponse format, return it as is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'data' in data &&
          'timestamp' in data
        ) {
          return data;
        }

        // Otherwise, wrap the data in our standard response format
        return successResponse<T>(data);
      }),

      // Transform errors
      catchError((err) => {
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let errorMessage = 'Internal server error';

        if (err instanceof HttpException) {
          statusCode = err.getStatus();
          const response = err.getResponse();
          errorMessage =
            typeof response === 'string'
              ? response
              : (response as any).message || errorMessage;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        // For HTTP responses, set the status code
        if (context.getType() === 'http') {
          const response = context.switchToHttp().getResponse();
          response.status(statusCode);
        }

        return throwError(() => err);
      })
    );
  }
}
