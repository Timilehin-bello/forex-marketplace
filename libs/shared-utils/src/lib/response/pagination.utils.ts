import {
  PaginationMeta,
  successResponse,
  ApiResponse,
} from './api-response.interface';

/**
 * Options for pagination queries
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

/**
 * Paginated response data
 */
export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  options: PaginationOptions
): ApiResponse<PaginatedData<T>> {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const totalPages = Math.ceil(total / limit);

  return successResponse<PaginatedData<T>>({
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

/**
 * TypeORM query options
 */
export interface TypeOrmQueryOptions {
  skip: number;
  take: number;
  order?: Record<string, 'ASC' | 'DESC'>;
}

/**
 * Create TypeORM query options from pagination options
 */
export function createPaginationOptions(options: PaginationOptions): {
  skip: number;
  take: number;
  order?: Record<string, 'ASC' | 'DESC'>;
} {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const queryOptions: any = {
    skip,
    take: limit,
  };

  if (options.sortBy) {
    queryOptions.order = {
      [options.sortBy]: options.sortDirection || 'ASC',
    };
  }

  return queryOptions;
}
