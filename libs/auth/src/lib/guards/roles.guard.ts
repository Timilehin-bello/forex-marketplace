import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Roles metadata key
 */
export const ROLES_KEY = 'roles';

/**
 * Roles decorator to set required roles for a route
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Guard to check if the user has the required roles
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler()
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Ensure user exists
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if user has admin role or required roles
    const hasRequiredRole =
      user.isAdmin || requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRequiredRole) {
      throw new UnauthorizedException('Insufficient permissions');
    }

    return true;
  }
}
