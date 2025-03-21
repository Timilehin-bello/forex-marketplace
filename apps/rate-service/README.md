# Rate Service

This service manages currency exchange rates in the Forex Marketplace application.

## Features

- Real-time currency exchange rate fetching
- Historical rate tracking
- Rate caching for performance
- Scheduled rate updates
- gRPC service for inter-service communication

## Prerequisites

- Node.js (v20.x)
- PostgreSQL
- Redis
- Docker and Docker Compose (for containerized setup)

## Dependencies

This service relies on the following main dependencies:

- NestJS framework
- TypeORM for database interactions
- gRPC for microservice communication
- Axios for external API calls
- Redis for caching
- NestJS Scheduler for periodic tasks

## Environment Variables

| Variable              | Description                        | Default        |
| --------------------- | ---------------------------------- | -------------- |
| NODE_ENV              | Environment mode                   | `development`  |
| PORT                  | HTTP port                          | `3003`         |
| DB_HOST               | PostgreSQL host                    | `localhost`    |
| DB_PORT               | PostgreSQL port                    | `5432`         |
| DB_USERNAME           | PostgreSQL username                | `postgres`     |
| DB_PASSWORD           | PostgreSQL password                | `postgres`     |
| DB_DATABASE           | PostgreSQL database name           | `forex`        |
| EXCHANGE_RATE_API_KEY | API key for exchange rate provider | -              |
| RATE_GRPC_URL         | gRPC server URL                    | `0.0.0.0:5001` |
| REDIS_HOST            | Redis host                         | `localhost`    |
| REDIS_PORT            | Redis port                         | `6379`         |

## Setup Instructions

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Build the shared libraries:
   ```bash
   yarn build:libs
   ```
4. Start the required services (PostgreSQL, Redis):
   ```bash
   yarn docker:up
   ```
5. Start the service in development mode:
   ```bash
   yarn dev:rate
   ```

### Using Docker

1. Start the service using Docker Compose:
   ```bash
   docker-compose up rate-service
   ```

### Production Deployment

1. Build the service:
   ```bash
   yarn build:rate
   ```
2. Run the compiled service:
   ```bash
   node dist/apps/rate-service/main.js
   ```

## API Endpoints

- `GET /api/v1/rates` - Get current exchange rates
- `GET /api/v1/rates/currency/:code` - Get rates for specific currency
- `GET /api/v1/rates/pair/:base/:quote` - Get rate for currency pair
- `GET /api/v1/rates/historical` - Get historical rates

## gRPC Service

The service exposes a gRPC interface for inter-service communication at the configured `RATE_GRPC_URL`.

## Testing

```bash
yarn test:rate
```
