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

export const CurrentRole = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user.role;
});

/** Branch to filter reads by; undefined means "all branches" (owners only). Set by BranchContextGuard. */
export const ActiveBranchId = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return request.user.activeBranchId;
});

/** Branch new sales/expenses are recorded against: the active branch, else the business's default. */
export const WriteBranchId = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return request.user.writeBranchId;
});
