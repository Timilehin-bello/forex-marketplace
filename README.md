# Forex Marketplace Microservices

A microservices-based foreign exchange (Forex) marketplace built with NestJS, TypeScript, TypeORM, and PostgreSQL.

## Architecture

This project consists of the following microservices:

- **User and Authentication Service**: Handles user registration, authentication, and profile management.
- **Wallet Service**: Manages user wallet balances and transactions.
- **Transaction and Order Service**: Processes forex buy/sell orders and maintains transaction history.
- **Rate Service**: Fetches current forex rates from an external API and exposes them to other services via gRPC.
- **Notification Service**: Sends notifications to users after successful transactions.

## Technologies

- **Backend Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Monorepo Management**: Nx
- **Internal Communication**: gRPC for synchronous communication
- **Message Queue**: RabbitMQ for asynchronous communication
- **API Style**: REST for user-facing endpoints
- **Containerization**: Docker and Docker Compose

## Getting Started

### Prerequisites

- Node.js (v16+)
- Yarn
- Docker and Docker Compose
- PostgreSQL (optional for local development without Docker)
- RabbitMQ (optional for local development without Docker)

### Installation

1. Clone the repository:

   ```bash
   git clone https://bitbucket.org/your-username/forex-marketplace.git
   cd forex-marketplace
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Create an `.env` file based on the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Update the values as needed, especially the `EXCHANGE_RATE_API_KEY`.

### Running with Docker

The easiest way to run the entire application is using Docker Compose:

```bash
docker-compose up -d
```

This will start all services, PostgreSQL, and RabbitMQ.

### Running Locally (Development)

To run services individually during development:

1. Start PostgreSQL and RabbitMQ (using Docker or local installations)

2. Build the shared libraries:

   ```bash
   yarn nx run-many --target=build --projects=shared-utils,shared-types,database,auth,grpc,message-queue
   ```

3. Run each service individually:

   ```bash
   # User Auth Service
   yarn nx serve user-auth-service

   # Wallet Service
   yarn nx serve wallet-service

   # Rate Service
   yarn nx serve rate-service

   # Transaction Service
   yarn nx serve transaction-service

   # Notification Service
   yarn nx serve notification-service
   ```

## API Documentation

The API documentation is available via Swagger UI when the services are running:

- User Auth Service: http://localhost:3001/api/docs
- Wallet Service: http://localhost:3002/api/docs
- Rate Service: http://localhost:3003/api/docs
- Transaction Service: http://localhost:3004/api/docs
- Notification Service: http://localhost:3005/api/docs

## Testing

To run tests:

```bash
# Run all tests
yarn nx run-many --target=test --all

# Run tests for a specific project
yarn nx test user-auth-service
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
