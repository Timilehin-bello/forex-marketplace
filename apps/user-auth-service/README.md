# User Authentication Service

This service handles user registration, authentication, and authorization in the Forex Marketplace application.

## Features

- User registration and account management
- Authentication via JWT tokens
- Role-based access control
- Admin user management
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
- JWT for authentication
- gRPC for microservice communication
- Redis for caching

## Environment Variables

| Variable        | Description               | Default                       |
| --------------- | ------------------------- | ----------------------------- |
| NODE_ENV        | Environment mode          | `development`                 |
| PORT            | HTTP port                 | `3001`                        |
| DB_HOST         | PostgreSQL host           | `localhost`                   |
| DB_PORT         | PostgreSQL port           | `5432`                        |
| DB_USERNAME     | PostgreSQL username       | `postgres`                    |
| DB_PASSWORD     | PostgreSQL password       | `postgres`                    |
| DB_DATABASE     | PostgreSQL database name  | `forex`                       |
| JWT_SECRET      | Secret key for JWT tokens | -                             |
| JWT_EXPIRES_IN  | JWT token expiration      | `7d`                          |
| USER_GRPC_URL   | gRPC server URL           | `0.0.0.0:5003`                |
| REDIS_HOST      | Redis host                | `localhost`                   |
| REDIS_PORT      | Redis port                | `6379`                        |
| ADMIN_EMAIL     | Admin user email          | `admin@forex-marketplace.com` |
| ADMIN_PASSWORD  | Admin user password       | `Admin@123456`                |
| ADMIN_FIRSTNAME | Admin user first name     | `Super`                       |
| ADMIN_LASTNAME  | Admin user last name      | `Admin`                       |

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
   yarn dev:user-auth
   ```

### Using Docker

1. Start the service using Docker Compose:
   ```bash
   docker-compose up user-auth-service
   ```

### Production Deployment

1. Build the service:
   ```bash
   yarn build:user-auth
   ```
2. Run the compiled service:
   ```bash
   node dist/apps/user-auth-service/main.js
   ```

## Creating Admin User

To create an admin user:

```bash
yarn create:admin
```

## API Endpoints

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update user profile
- `GET /api/v1/users` - List users (admin only)
- `GET /api/v1/users/:id` - Get user by ID (admin only)

## gRPC Service

The service exposes a gRPC interface for inter-service communication at the configured `USER_GRPC_URL`.

## Testing

```bash
yarn test:user-auth
```
