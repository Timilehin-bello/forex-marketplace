# API Response Standards

This document outlines the standardized response structure used across all API endpoints in the forex-marketplace application.

## Standard Response Format

All API responses follow this standard structure:

```json
{
  "success": true|false,
  "data": [response data object or array],
  "error": null|"error message",
  "timestamp": "ISO timestamp",
  "meta": {
    // Optional metadata object
  }
}
```

### Fields

- **success**: Boolean indicating if the request was successful
- **data**: Contains the actual response data (can be an object, array, or null for error responses)
- **error**: Contains error message for failed requests, null for successful requests
- **timestamp**: ISO 8601 format timestamp of when the response was generated
- **meta**: Optional metadata object, typically used for pagination details

## Pagination

Paginated endpoints use the following structure:

```json
{
  "success": true,
  "data": {
    "items": [
      // Array of items
    ],
    "meta": {
      "page": 1, // Current page number
      "limit": 10, // Items per page
      "total": 100, // Total number of items
      "totalPages": 10 // Total number of pages
    }
  },
  "error": null,
  "timestamp": "ISO timestamp"
}
```

## Error Responses

Error responses follow the standard structure with success set to false:

```json
{
  "success": false,
  "data": null,
  "error": "Detailed error message",
  "timestamp": "ISO timestamp",
  "meta": {
    "statusCode": 404,
    "path": "/api/resource",
    "method": "GET"
  }
}
```

## Implementation

The response structure is automatically applied to all endpoints using the `ResponseInterceptor` from the shared-utils library. Controllers don't need to manually wrap their responses.

### Using in Controllers

For standard responses, simply return the data:

```typescript
@Get(':id')
async getItem(@Param('id') id: string) {
  const item = await this.service.findOne(id);
  return item; // Automatically wrapped by interceptor
}
```

For explicit wrapping:

```typescript
import { successResponse } from '@forex-marketplace/shared-utils';

@Get(':id')
async getItem(@Param('id') id: string) {
  const item = await this.service.findOne(id);
  return successResponse(item, { additionalInfo: 'some metadata' });
}
```

For paginated responses:

```typescript
import { paginatedResponse } from '@forex-marketplace/shared-utils';

@Get()
async getItems(@Query() query) {
  const { items, total } = await this.service.findAll(query);
  return paginatedResponse(items, total, {
    page: query.page || 1,
    limit: query.limit || 10
  });
}
```
