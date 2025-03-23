import { Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Service for handling common authorization logic
 */
@Injectable()
export class AuthorizationService {
  /**
   * Check if a user can access a resource
   * @param resourceUserId The user ID of the resource owner
   * @param currentUser The current user
   * @param errorMessage The error message to throw if unauthorized
   * @throws UnauthorizedException if user is not authorized
   */
  public ensureOwnerOrAdmin(
    resourceUserId: string,
    currentUser: any,
    errorMessage = 'You are not authorized to access this resource'
  ): void {
    // Allow access if user is the owner or admin
    if (resourceUserId === currentUser.id || currentUser.isAdmin) {
      return;
    }

    throw new UnauthorizedException(errorMessage);
  }

  /**
   * Check if the current user has admin role
   * @param currentUser The current user
   * @param errorMessage The error message to throw if unauthorized
   * @throws UnauthorizedException if user is not an admin
   */
  public ensureAdmin(
    currentUser: any,
    errorMessage = 'Admin access required'
  ): void {
    if (!currentUser.isAdmin) {
      throw new UnauthorizedException(errorMessage);
    }
  }

  /**
   * Check if the current user has a specific role
   * @param currentUser The current user
   * @param requiredRole The required role
   * @param errorMessage The error message to throw if unauthorized
   * @throws UnauthorizedException if user does not have the required role
   */
  public ensureRole(
    currentUser: any,
    requiredRole: string,
    errorMessage = 'Insufficient permissions'
  ): void {
    if (
      !currentUser.isAdmin &&
      (!currentUser.roles || !currentUser.roles.includes(requiredRole))
    ) {
      throw new UnauthorizedException(errorMessage);
    }
  }
}
