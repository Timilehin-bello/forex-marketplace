/**
 * Standard API response interface for consistent response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  timestamp: string;
  meta?: Record<string, any>;
}

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Error metadata interface
 */
export interface ErrorMeta {
  statusCode?: number;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

/**
 * Success response factory function
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, any>
): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString(),
    meta,
  };
}

/**
 * Error response factory function
 */
export function errorResponse(
  message: string,
  data: any = null
): ApiResponse<any> {
  return {
    success: false,
    data,
    error: message,
    timestamp: new Date().toISOString(),
  };
}
