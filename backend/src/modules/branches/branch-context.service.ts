import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch, Role } from '../../entities';

interface BranchSet {
  ids: Set<string>;
  defaultId?: string;
  expires: number;
}

export interface BranchContext {
  /** Branch to filter reads by. Undefined = all branches (owners only). */
  activeBranchId?: string;
  /** Branch new records are tagged with. */
  writeBranchId?: string;
}

const CACHE_TTL_MS = 60_000;

/**
 * Works out which branch a request acts on. Staff are pinned to their own
 * branch and cannot override it; owners choose with the X-Branch-Id header
 * (validated against their own business, so a header can't reach into
 * another business's branch).
 */
@Injectable()
export class BranchContextService {
  private readonly cache = new Map<string, BranchSet>();

  constructor(@InjectRepository(Branch) private readonly branches: Repository<Branch>) {}

  invalidate(businessId: string) {
    this.cache.delete(businessId);
  }

  private async load(businessId: string): Promise<BranchSet> {
    const cached = this.cache.get(businessId);
    if (cached && cached.expires > Date.now()) return cached;
    const rows = await this.branches.find({ where: { businessId }, select: ['id', 'isDefault'] });
    const set: BranchSet = {
      ids: new Set(rows.map((r) => r.id)),
      defaultId: rows.find((r) => r.isDefault)?.id ?? rows[0]?.id,
      expires: Date.now() + CACHE_TTL_MS,
    };
    this.cache.set(businessId, set);
    return set;
  }

  async resolve(
    user: { businessId: string; role: Role; branchId?: string | null },
    headerBranchId?: string,
  ): Promise<BranchContext> {
    const set = await this.load(user.businessId);

    let activeBranchId: string | undefined;
    if (user.role === Role.STAFF) {
      activeBranchId = user.branchId && set.ids.has(user.branchId) ? user.branchId : undefined;
    } else if (headerBranchId) {
      if (!set.ids.has(headerBranchId)) throw new BadRequestException('Unknown branch');
      activeBranchId = headerBranchId;
    }

    return { activeBranchId, writeBranchId: activeBranchId ?? set.defaultId };
  }
}
