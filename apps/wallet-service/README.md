# Wallet Service

This service manages user wallets, balances, and currency conversion in the Forex Marketplace application.

## Features

- Wallet creation and management
- Balance tracking across multiple currencies
- Currency conversion
- Transaction processing
- gRPC service for inter-service communication

## Prerequisites

- Node.js (v20.x)
- PostgreSQL
- Redis
- RabbitMQ
- Docker and Docker Compose (for containerized setup)

## Dependencies

This service relies on the following main dependencies:

- NestJS framework
- TypeORM for database interactions
- gRPC for microservice communication
- RabbitMQ for message queueing
- Redis for caching

## Environment Variables

| Variable          | Description               | Default                             |
| ----------------- | ------------------------- | ----------------------------------- |
| NODE_ENV          | Environment mode          | `development`                       |
| WALLET_PORT       | HTTP port                 | `3002`                              |
| WALLET_GRPC_PORT  | gRPC port                 | `5002`                              |
| DB_HOST           | PostgreSQL host           | `localhost`                         |
| DB_PORT           | PostgreSQL port           | `5432`                              |
| DB_USERNAME       | PostgreSQL username       | `postgres`                          |
| DB_PASSWORD       | PostgreSQL password       | `postgres`                          |
| DB_DATABASE       | PostgreSQL database name  | `forex`                             |
| JWT_SECRET        | Secret key for JWT tokens | -                                   |
| RABBITMQ_URL      | RabbitMQ connection URL   | `amqp://guest:guest@localhost:5672` |
| WALLET_GRPC_URL   | gRPC server URL           | `localhost:5002`                    |
| USER_GRPC_URL     | User service gRPC URL     | `localhost:5013`                    |
| REDIS_HOST        | Redis host                | `localhost`                         |
| REDIS_PORT        | Redis port                | `6379`                              |

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
4. Start the required services (PostgreSQL, Redis, RabbitMQ):
   ```bash
   yarn docker:up
   ```
5. Start the service in development mode:
   ```bash
   yarn dev:wallet
   ```

### Using Docker

1. Start the service using Docker Compose:
   ```bash
   docker-compose up wallet-service
   ```

### Production Deployment

1. Build the service:
   ```bash
   yarn build:wallet
   ```
2. Run the compiled service:
   ```bash
   node dist/apps/wallet-service/main.js
   ```

## API Endpoints

- `GET /api/v1/wallets` - Get user wallets
- `GET /api/v1/wallets/:id` - Get wallet by ID
- `POST /api/v1/wallets` - Create a new wallet
- `PUT /api/v1/wallets/:id` - Update wallet
- `DELETE /api/v1/wallets/:id` - Delete wallet
- `POST /api/v1/wallets/:id/deposit` - Deposit funds
- `POST /api/v1/wallets/:id/withdraw` - Withdraw funds
- `POST /api/v1/wallets/:id/convert` - Convert between currencies

## gRPC Service

The service exposes a gRPC interface for inter-service communication at the configured `WALLET_GRPC_URL`.

## Testing

```bash
yarn test:wallet
```
