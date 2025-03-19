#!/bin/bash
set -e

# Default values
EMAIL=${ADMIN_EMAIL:-admin@forex-marketplace.com}
PASSWORD=${ADMIN_PASSWORD:-Admin@123456}
FIRST_NAME=${ADMIN_FIRSTNAME:-Super}
LAST_NAME=${ADMIN_LASTNAME:-Admin}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--email)
      EMAIL="$2"
      shift 2
      ;;
    -p|--password)
      PASSWORD="$2"
      shift 2
      ;;
    -f|--first-name)
      FIRST_NAME="$2"
      shift 2
      ;;
    -l|--last-name)
      LAST_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "Creating admin user..."
echo "Email: $EMAIL"
echo "First Name: $FIRST_NAME"
echo "Last Name: $LAST_NAME"

# Run the CLI command inside the user-auth-service container
docker-compose exec user-auth-service node dist/apps/user-auth-service/cli.js create-admin \
  -e "$EMAIL" \
  -p "$PASSWORD" \
  -f "$FIRST_NAME" \
  -l "$LAST_NAME"

echo "Admin user creation complete." 