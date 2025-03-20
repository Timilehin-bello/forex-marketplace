export interface PaginationDto {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaginationHelper {
  static paginate<T>(
    items: T[],
    count: number,
    page = 1,
    limit = 10
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(count / limit);

    return {
      items,
      total: count,
      page,
      limit,
      totalPages,
    };
  }
}
