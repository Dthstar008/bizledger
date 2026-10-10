import { BadRequestException } from '@nestjs/common';
import { Role } from '../../entities';
import { BranchContextService } from './branch-context.service';

function build() {
  const repo = {
    find: jest.fn().mockResolvedValue([
      { id: 'b-main', isDefault: true },
      { id: 'b-lekki', isDefault: false },
    ]),
  };
  return { service: new BranchContextService(repo as any), repo };
}

describe('BranchContextService.resolve', () => {
  it('owner with no header sees all branches and writes to the default branch', async () => {
    const { service } = build();
    expect(await service.resolve({ businessId: 'biz', role: Role.OWNER })).toEqual({
      activeBranchId: undefined,
      writeBranchId: 'b-main',
    });
  });

  it('owner header selects a branch for both reads and writes', async () => {
    const { service } = build();
    expect(await service.resolve({ businessId: 'biz', role: Role.OWNER }, 'b-lekki')).toEqual({
      activeBranchId: 'b-lekki',
      writeBranchId: 'b-lekki',
    });
  });

  it('rejects a branch header that is not one of the business branches', async () => {
    const { service } = build();
    await expect(service.resolve({ businessId: 'biz', role: Role.OWNER }, 'someone-elses')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('pins staff to their own branch and ignores the header', async () => {
    const { service } = build();
    expect(await service.resolve({ businessId: 'biz', role: Role.STAFF, branchId: 'b-lekki' }, 'b-main')).toEqual({
      activeBranchId: 'b-lekki',
      writeBranchId: 'b-lekki',
    });
  });

  it('caches the branch list per business and refreshes after invalidate()', async () => {
    const { service, repo } = build();
    await service.resolve({ businessId: 'biz', role: Role.OWNER });
    await service.resolve({ businessId: 'biz', role: Role.OWNER });
    expect(repo.find).toHaveBeenCalledTimes(1);
    service.invalidate('biz');
    await service.resolve({ businessId: 'biz', role: Role.OWNER });
    expect(repo.find).toHaveBeenCalledTimes(2);
  });
});
