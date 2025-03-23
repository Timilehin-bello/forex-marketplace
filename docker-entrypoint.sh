#!/bin/sh
set -e

# Check if SERVICE_NAME is provided
if [ -z "$SERVICE_NAME" ]; then
  echo "Error: SERVICE_NAME environment variable is required"
  exit 1
fi

# Start the specified service
case "$SERVICE_NAME" in
  user-auth-service)
    # Admin seeding is handled by AdminSeedService during startup
    # Log admin credentials for verification
    echo "Starting user-auth-service with admin seeding..."
    echo "Admin email: ${ADMIN_EMAIL:-admin@forex-marketplace.com}"
    echo "Admin first name: ${ADMIN_FIRSTNAME:-Super}"
    echo "Admin last name: ${ADMIN_LASTNAME:-Admin}"
    
    exec node dist/apps/user-auth-service/main.js
    ;;
  wallet-service)
    exec node dist/apps/wallet-service/main.js
    ;;
  rate-service)
    exec node dist/apps/rate-service/main.js
    ;;
  transaction-service)
    exec node dist/apps/transaction-service/main.js
    ;;
  notification-service)
    exec node dist/apps/notification-service/main.js
    ;;
  *)
    echo "Unknown service: $SERVICE_NAME"
    exit 1
    ;;
esac