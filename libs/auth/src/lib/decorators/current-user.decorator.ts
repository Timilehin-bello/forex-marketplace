import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to get the current user from the request object
 * This simplifies accessing the user data in controllers
 *
 * Usage: @CurrentUser() user: UserEntity
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
