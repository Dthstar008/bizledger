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

/** Who performed a write, stamped onto the ledger event it produces. */
export interface Actor {
  userId: string;
  branchId?: string | null;
}

export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => {
  const { user } = ctx.switchToHttp().getRequest();
  return { userId: user.userId, branchId: user.writeBranchId ?? user.branchId ?? null };
});

/** Ledger metadata fields identifying the actor; empty when a write has no request behind it (seed, jobs). */
export function actorMeta(actor?: Actor): Record<string, string> {
  if (!actor) return {};
  return actor.branchId ? { actorId: actor.userId, branchId: actor.branchId } : { actorId: actor.userId };
}
