# Forex Marketplace Microservices

A comprehensive microservices-based foreign exchange (Forex) marketplace built with NestJS, TypeScript, TypeORM, and PostgreSQL.

## Architecture

This project consists of the following microservices:

- **User and Authentication Service**: Handles user registration, authentication, and profile management.
- **Wallet Service**: Manages user wallet balances and transactions.
- **Transaction Service**: Processes forex buy/sell orders and maintains transaction history.
- **Rate Service**: Fetches current forex rates from an external API and exposes them to other services via gRPC.
- **Notification Service**: Sends notifications to users after successful transactions.

## Technologies

- **Backend Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Monorepo Management**: Nx
- **Internal Communication**: gRPC for synchronous communication
- **Message Queue**: RabbitMQ for asynchronous communication
- **Caching**: Redis for performance optimization
- **API Style**: REST for user-facing endpoints
- **Containerization**: Docker and Docker Compose

## System Prerequisites

- **Node.js**: v20.x
- **Yarn**: Latest version
- **Docker**: Latest version
- **Docker Compose**: Latest version
- **PostgreSQL**: 14 or higher (if running without Docker)
- **RabbitMQ**: 3.x (if running without Docker)
- **Redis**: 7.x (if running without Docker)

## Core Dependencies

- **@nestjs/common, @nestjs/core**: NestJS framework
- **@nestjs/typeorm, typeorm, pg**: Database ORM and PostgreSQL driver
- **@nestjs/microservices, @grpc/grpc-js**: Microservices and gRPC
- **amqplib, amqp-connection-manager**: RabbitMQ client
- **@nestjs/jwt, passport, passport-jwt**: Authentication
- **class-validator, class-transformer**: Data validation
- **nodemailer**: Email sending
- **ioredis**: Redis client

## Getting Started

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/forex-marketplace.git
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

### Environment Variables

All necessary environment variables are listed below. You can configure them in the `.env` file:

#### Common Variables
| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | `development` |
| DB_HOST | PostgreSQL host | `localhost` |
| DB_PORT | PostgreSQL port | `5432` |
| DB_USERNAME | PostgreSQL username | `postgres` |
| DB_PASSWORD | PostgreSQL password | `postgres` |
| DB_DATABASE | PostgreSQL database name | `forex` |
| RABBITMQ_URL | RabbitMQ connection URL | `amqp://guest:guest@localhost:5672` |
| REDIS_HOST | Redis host | `localhost` |
| REDIS_PORT | Redis port | `6379` |
| JWT_SECRET | Secret key for JWT tokens | (Set a secure value) |
| JWT_EXPIRES_IN | JWT token expiration | `7d` |

#### Service-Specific Variables
| Variable | Description | Service | Default |
|----------|-------------|---------|---------|
| USER_AUTH_PORT | User Auth Service HTTP port | User Auth | `3001` |
| USER_AUTH_GRPC_PORT | User Auth Service gRPC port | User Auth | `5013` |
| USER_GRPC_URL | User Auth gRPC URL | User Auth | `localhost:5013` |
| WALLET_PORT | Wallet Service HTTP port | Wallet | `3002` |
| WALLET_GRPC_PORT | Wallet Service gRPC port | Wallet | `5002` |
| WALLET_GRPC_URL | Wallet gRPC URL | Wallet | `localhost:5002` |
| RATE_PORT | Rate Service HTTP port | Rate | `3003` |
| RATE_GRPC_PORT | Rate Service gRPC port | Rate | `5011` |
| RATE_GRPC_URL | Rate gRPC URL | Rate | `localhost:5011` |
| TRANSACTION_PORT | Transaction Service HTTP port | Transaction | `3014` |
| TRANSACTION_GRPC_PORT | Transaction Service gRPC port | Transaction | `5014` |
| TRANSACTION_GRPC_URL | Transaction gRPC URL | Transaction | `localhost:5014` |
| NOTIFICATION_PORT | Notification Service HTTP port | Notification | `3006` |
| NOTIFICATION_GRPC_PORT | Notification Service gRPC port | Notification | `5006` |
| NOTIFICATION_GRPC_URL | Notification gRPC URL | Notification | `localhost:5006` |
| ADMIN_EMAIL | Admin user email | User Auth | `admin@forex-marketplace.com` |
| ADMIN_PASSWORD | Admin user password | User Auth | `Admin@123456` |
| ADMIN_FIRSTNAME | Admin first name | User Auth | `Super` |
| ADMIN_LASTNAME | Admin last name | User Auth | `Admin` |
| EXCHANGE_RATE_API_KEY | API key for rates | Rate | (Required) |
| EMAIL_FROM | Email sender address | Notification | `noreply@forex-platform.com` |
| SMTP_HOST | SMTP server host | Notification | (Required for emails) |
| SMTP_PORT | SMTP server port | Notification | `587` |
| SMTP_SECURE | Use secure connection | Notification | `false` |
| SMTP_USER | SMTP username | Notification | (Required for emails) |
| SMTP_PASSWORD | SMTP password | Notification | (Required for emails) |

### Running with Docker

The easiest way to run the entire application is using Docker Compose:

```bash
# Start all services
yarn docker:up

# Start in detached mode
yarn docker:up:detached

# View logs
yarn docker:logs

# Stop all services
yarn docker:down
```

### Running Locally (Development)

1. Start infrastructure services:

   ```bash
   # Start only PostgreSQL, Redis, and RabbitMQ
   docker-compose up postgres redis rabbitmq -d
   ```

2. Build the shared libraries:

   ```bash
   yarn build:libs
   ```

3. Run all services in development mode:

   ```bash
   yarn dev:all
   ```

   Or run individual services:

   ```bash
   yarn dev:user-auth
   yarn dev:wallet
   yarn dev:rate
   yarn dev:transaction
   yarn dev:notification
   ```

### Creating an Admin User

To create an admin user, run:

```bash
yarn create:admin
```

This uses the ADMIN_* environment variables to create a default admin account.

## Development Workflow

### Run Database Migrations

```bash
# Generate a new migration
yarn migration:generate --name=MigrationName

# Run migrations
yarn migration:run

# Revert migrations
yarn migration:revert
```

### Linting and Formatting

```bash
# Lint code
yarn lint

# Fix linting issues
yarn lint:fix

# Format code
yarn format
```

## Testing

```bash
# Run all tests
yarn test:all

# Run tests for a specific service
yarn test:user-auth
yarn test:wallet
yarn test:rate
yarn test:transaction
yarn test:notification

# Run tests with coverage
yarn test:coverage
```

## API Documentation

The services expose the following REST API endpoints:

### User Auth Service (Port 3001)
- `POST /api/v1/users/register` - Register a new user
- `POST /api/v1/users/login` - Login and get JWT token
- `GET /api/v1/users/profile` - Get user profile
- `POST /api/v1/users/admin` - Create admin user (requires admin role)
- `POST /api/v1/users/promote/:userId` - Promote user to admin (requires admin role)

### Wallet Service (Port 3002)
- `POST /api/v1/wallets` - Create a new wallet
- `GET /api/v1/wallets/:id` - Get wallet by ID
- `GET /api/v1/wallets/user/:userId` - Get wallets by user ID
- `GET /api/v1/wallets/user/:userId/currency/:currency` - Get wallet by user ID and currency
- `POST /api/v1/wallets/transaction` - Process a transaction (deposit/withdraw)
- `GET /api/v1/wallets/:walletId/transactions` - Get transactions for a wallet

### Rate Service (Port 3003)
- `GET /api/v1/rates` - Get all exchange rates
- `GET /api/v1/rates/:baseCurrency/:targetCurrency` - Get rate for currency pair

### Transaction Service (Port 3014)
- `POST /api/v1/transactions/orders` - Create a new order
- `GET /api/v1/transactions/orders/:id` - Get order by ID
- `GET /api/v1/transactions/user/:userId/orders` - Get user orders
- `GET /api/v1/transactions/orders/:orderId/transactions` - Get transactions for an order

### Notification Service (Port 3006)
- `GET /api/v1/notifications/user/:userId` - Get user notifications
- `PUT /api/v1/notifications/:id/read` - Mark notification as read

## Additional Documentation

For more detailed information, refer to the following documentation:

- [`docs/admin-user-creation.md`](docs/admin-user-creation.md): Detailed guide for creating admin users
- [`docs/api-response-standards.md`](docs/api-response-standards.md): API response format standards

Additionally, each microservice has its own README.md file in its respective directory with service-specific details.

## Project Structure

```
forex-marketplace/
├── apps/                           # Microservices
│   ├── user-auth-service/          # User Authentication Service
│   ├── wallet-service/             # Wallet Service
│   ├── rate-service/               # Rate Service
│   ├── transaction-service/        # Transaction Service
│   └── notification-service/       # Notification Service
├── libs/                           # Shared libraries
│   ├── shared-types/               # Common TypeScript interfaces
│   ├── shared-utils/               # Shared utilities
│   ├── database/                   # Database and TypeORM configuration
│   ├── auth/                       # Authentication utilities
│   ├── grpc/                       # gRPC related code and protos
│   └── message-queue/              # RabbitMQ utilities
├── docker-compose.yml              # Docker Compose configuration
├── Dockerfile                      # Docker configuration
├── .env.example                    # Example environment variables
└── package.json                    # Project dependencies and scripts
```

## Production Deployment

For a production environment:

1. Configure production environment variables in `.env` file
2. Build all services:
   ```bash
   yarn build:all
   ```
3. Deploy using Docker:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.