import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserService } from '../services/user.service';
import { LoggerService } from '@forex-marketplace/shared-utils';

interface UserByIdRequest {
  id: string;
}

interface UserByEmailRequest {
  email: string;
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Controller()
export class UserGrpcController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: LoggerService
  ) {}

  @GrpcMethod('UserService', 'GetUserById')
  async getUserById(data: UserByIdRequest): Promise<UserResponse> {
    try {
      this.logger.log(`[gRPC] GetUserById: ${data.id}`);
      const user = await this.userService.findById(data.id);

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `[gRPC] GetUserById error: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @GrpcMethod('UserService', 'GetUserByEmail')
  async getUserByEmail(data: UserByEmailRequest): Promise<UserResponse> {
    try {
      this.logger.log(`[gRPC] GetUserByEmail: ${data.email}`);
      const user = await this.userService.findByEmail(data.email);

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `[gRPC] GetUserByEmail error: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
