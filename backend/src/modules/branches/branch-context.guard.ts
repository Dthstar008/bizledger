import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { BranchContextService } from './branch-context.service';

/** Run after JwtAuthGuard. Adds activeBranchId / writeBranchId to req.user. */
@Injectable()
export class BranchContextGuard implements CanActivate {
  constructor(private readonly branchContext: BranchContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers['x-branch-id'];
    const ctx = await this.branchContext.resolve(request.user, Array.isArray(header) ? header[0] : header);
    request.user.activeBranchId = ctx.activeBranchId;
    request.user.writeBranchId = ctx.writeBranchId;
    return true;
  }
}
