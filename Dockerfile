FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy source code
COPY . .

# Build all projects
RUN yarn nx run-many --target=build --all

# Make sure the proto files are copied to dist directory
RUN mkdir -p dist/libs/grpc/protos && cp -r libs/grpc/src/lib/protos/* dist/libs/grpc/protos/

FROM node:20-alpine

WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x /app/docker-entrypoint.sh

# Copy proto files - important!
COPY --from=builder /app/libs/grpc/src/lib/protos ./libs/grpc/src/lib/protos

# Set environment variable for service name
ENV SERVICE_NAME=user-auth-service

# Expose port
EXPOSE 3000

# Use entrypoint script
CMD ["/bin/sh", "-c", "/app/docker-entrypoint.sh"]