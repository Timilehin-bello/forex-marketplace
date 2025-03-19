# Admin User Creation Guide

This document outlines the different methods to create admin users in the forex-marketplace application.

## 1. Automatic Seeding at Startup

An admin user is automatically created when the application starts if no admin user exists in the database. This is handled by the `AdminSeedService` which runs during application initialization.

The admin credentials are read from environment variables:

```
ADMIN_EMAIL=admin@forex-marketplace.com
ADMIN_PASSWORD=Admin@123456
ADMIN_FIRSTNAME=Super
ADMIN_LASTNAME=Admin
```

You can customize these values in the `.env` file.

## 2. Using the CLI Command

You can create an admin user manually using the CLI command:

```bash
# Basic usage
yarn create:admin -e admin@example.com -p SecurePassword123 -f Admin -l User

# Help
yarn create:admin --help
```

Options:

- `-e, --email`: Admin email (required)
- `-p, --password`: Admin password (required)
- `-f, --firstName`: Admin first name (required)
- `-l, --lastName`: Admin last name (required)

## 3. Using the Admin Creation API Endpoint

Admin users can create additional admin users via the API:

```http
POST /users/admin
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "password": "SecurePassword123",
  "firstName": "New",
  "lastName": "Admin",
  "roles": ["ADMIN"]
}
```

This endpoint requires authentication with an existing admin user token.

## 4. Promoting an Existing User to Admin

Admins can promote existing users to admin status:

```http
POST /users/promote/{userId}
Authorization: Bearer <admin_jwt_token>
```

## 5. Admin User Creation in Docker

When running the application with Docker Compose, admin user creation is handled automatically.

### 5.1. Using Environment Variables

The admin user credentials can be specified in the `docker-compose.yml` file or provided as environment variables:

```bash
# Start the application with custom admin credentials
ADMIN_EMAIL=custom@example.com ADMIN_PASSWORD=CustomPass123 ADMIN_FIRSTNAME=Custom ADMIN_LASTNAME=AdminUser docker-compose up
```

### 5.2. Using the create-admin.sh Script

For manual admin creation when Docker containers are running:

```bash
# Using defaults from environment variables
./create-admin.sh

# Custom credentials
./create-admin.sh -e new-admin@example.com -p StrongPassword123 -f New -l Admin
```

### 5.3. Docker Build Arguments

When building the Docker image directly, you can provide build arguments:

```bash
docker build --build-arg ADMIN_EMAIL=custom@example.com --build-arg ADMIN_PASSWORD=SecurePass123 -t forex-marketplace .
```

## Admin User Privileges

Admin users have the following privileges:

- Access to all user data in the system
- Ability to create other admin users
- Access to all wallets and transactions
- Access to admin-only API endpoints

## Security Considerations

- Admin accounts should use strong passwords
- Admin API endpoints are protected by JWT authentication and role-based guards
- All admin actions are logged for audit purposes
- Only grant admin access to trusted users
