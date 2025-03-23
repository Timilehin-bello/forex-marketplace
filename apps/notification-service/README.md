# Notification Service

This service manages notifications to users in the Forex Marketplace application.

## Features

- Email notifications
- Transaction notifications
- Account activity alerts
- Message queue subscription for event-driven notifications
- Notification templates

## Prerequisites

- Node.js (v20.x)
- PostgreSQL
- Redis
- RabbitMQ
- SMTP server (for email notifications)
- Docker and Docker Compose (for containerized setup)

## Dependencies

This service relies on the following main dependencies:

- NestJS framework
- TypeORM for database interactions
- RabbitMQ for message queueing
- Nodemailer for sending emails
- Redis for caching

## Environment Variables

| Variable                | Description               | Default                             |
| ----------------------- | ------------------------- | ----------------------------------- |
| NODE_ENV                | Environment mode          | `development`                       |
| NOTIFICATION_PORT       | HTTP port                 | `3006`                              |
| NOTIFICATION_GRPC_PORT  | gRPC port                 | `5006`                              |
| DB_HOST                 | PostgreSQL host           | `localhost`                         |
| DB_PORT                 | PostgreSQL port           | `5432`                              |
| DB_USERNAME             | PostgreSQL username       | `postgres`                          |
| DB_PASSWORD             | PostgreSQL password       | `postgres`                          |
| DB_DATABASE             | PostgreSQL database name  | `forex`                             |
| JWT_SECRET              | Secret key for JWT tokens | -                                   |
| RABBITMQ_URL            | RabbitMQ connection URL   | `amqp://guest:guest@localhost:5672` |
| NOTIFICATION_GRPC_URL   | Notification gRPC URL     | `localhost:5006`                    |
| REDIS_HOST              | Redis host                | `localhost`                         |
| REDIS_PORT              | Redis port                | `6379`                              |
| EMAIL_FROM              | Email sender address      | `noreply@forex-platform.com`        |
| SMTP_HOST               | SMTP server host          | -                                   |
| SMTP_PORT               | SMTP server port          | `587`                               |
| SMTP_SECURE             | Use secure connection     | `false`                             |
| SMTP_USER               | SMTP server username      | -                                   |
| SMTP_PASSWORD           | SMTP server password      | -                                   |

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
   yarn dev:notification
   ```

### Using Docker

1. Start the service using Docker Compose:
   ```bash
   docker-compose up notification-service
   ```

### Production Deployment

1. Build the service:
   ```bash
   yarn build:notification
   ```
2. Run the compiled service:
   ```bash
   node dist/apps/notification-service/main.js
   ```

## API Endpoints

- `GET /api/v1/notifications/user/:userId` - Get notifications for a user
- `PUT /api/v1/notifications/:id/read` - Mark notification as read

## Messaging

The service subscribes to various RabbitMQ queues to receive notification events from other services:

- Transaction events
- User account events
- System alerts

## Testing

```bash
yarn test:notification
```
