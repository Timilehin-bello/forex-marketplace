# Transaction Service

This service manages financial transactions in the Forex Marketplace application.

## Features

- Currency exchange transaction processing
- Transaction history tracking
- Payment processing
- Integration with wallet service
- Transaction notifications via message queue

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

| Variable               | Description                | Default                             |
| ---------------------- | -------------------------- | ----------------------------------- |
| NODE_ENV               | Environment mode           | `development`                       |
| TRANSACTION_PORT       | HTTP port                  | `3014`                              |
| TRANSACTION_GRPC_PORT  | gRPC port                  | `5014`                              |
| DB_HOST                | PostgreSQL host            | `localhost`                         |
| DB_PORT                | PostgreSQL port            | `5432`                              |
| DB_USERNAME            | PostgreSQL username        | `postgres`                          |
| DB_PASSWORD            | PostgreSQL password        | `postgres`                          |
| DB_DATABASE            | PostgreSQL database name   | `forex`                             |
| JWT_SECRET             | Secret key for JWT tokens  | -                                   |
| RATE_GRPC_URL          | Rate service gRPC URL      | `localhost:5011`                    |
| WALLET_GRPC_URL        | Wallet service gRPC URL    | `localhost:5002`                    |
| USER_GRPC_URL          | User auth service gRPC URL | `localhost:5013`                    |
| TRANSACTION_GRPC_URL   | Transaction gRPC URL       | `localhost:5014`                    |
| RABBITMQ_URL           | RabbitMQ connection URL    | `amqp://guest:guest@localhost:5672` |
| REDIS_HOST             | Redis host                 | `localhost`                         |
| REDIS_PORT             | Redis port                 | `6379`                              |

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
   yarn dev:transaction
   ```

### Using Docker

1. Start the service using Docker Compose:
   ```bash
   docker-compose up transaction-service
   ```

### Production Deployment

1. Build the service:
   ```bash
   yarn build:transaction
   ```
2. Run the compiled service:
   ```bash
   node dist/apps/transaction-service/main.js
   ```

## API Endpoints

- `GET /api/v1/transactions` - Get user transactions
- `GET /api/v1/transactions/:id` - Get transaction by ID
- `POST /api/v1/transactions` - Create a new transaction
- `GET /api/v1/transactions/history` - Get transaction history
- `POST /api/v1/transactions/exchange` - Perform currency exchange

## Messaging

The service publishes transaction events to RabbitMQ for other services to consume (e.g., notification service).

## Testing

```bash
yarn test:transaction
```
