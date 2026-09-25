import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../../entities';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchContextService } from './branch-context.service';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly branchContext: BranchContextService,
  ) {}

  findAll(businessId: string, onlyBranchId?: string | null): Promise<Branch[]> {
    return this.branches.find({
      where: onlyBranchId ? { businessId, id: onlyBranchId } : { businessId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async create(businessId: string, dto: CreateBranchDto): Promise<Branch> {
    const branch = await this.branches.save(this.branches.create({ ...dto, businessId, isDefault: false }));
    this.branchContext.invalidate(businessId);
    return branch;
  }

  async update(businessId: string, id: string, dto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.branches.findOne({ where: { id, businessId } });
    if (!branch) throw new NotFoundException('Branch not found');
    Object.assign(branch, dto);
    return this.branches.save(branch);
  }
}
