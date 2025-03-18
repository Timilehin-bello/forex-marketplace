FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build all projects
RUN yarn nx run-many --target=build --all

FROM node:20-alpine

WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy proto files - important!
COPY --from=builder /app/libs/grpc/src/lib/protos ./libs/grpc/src/lib/protos
COPY --from=builder /app/apps/transaction-service/src/app/protos ./apps/transaction-service/src/app/protos

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/apps/user-auth-service/main.js"]
