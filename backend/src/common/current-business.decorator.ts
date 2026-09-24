import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Every request is scoped to the authenticated user's business.
 * Pulls businessId off req.user, set by JwtStrategy.validate().
 */
export const CurrentBusinessId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.user.businessId;
});

export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.user.userId;
});
