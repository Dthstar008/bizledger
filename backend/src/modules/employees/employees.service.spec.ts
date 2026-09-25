import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '../../entities';
import { EmployeesService } from './employees.service';

function build(overrides: { existingEmail?: boolean; branch?: unknown; target?: unknown } = {}) {
  const users = {
    findOne: jest.fn(async (opts: { where: { email?: string; id?: string } }) => {
      if (opts.where.email) return overrides.existingEmail ? { id: 'x' } : null;
      return overrides.target ?? null;
    }),
    create: jest.fn((v) => ({ id: 'new-user', createdAt: new Date(), ...v })),
    save: jest.fn(async (v) => v),
    delete: jest.fn(),
    find: jest.fn(),
  };
  const branches = {
    findOne: jest.fn().mockResolvedValue(overrides.branch === undefined ? { id: 'b-main' } : overrides.branch),
  };
  return { service: new EmployeesService(users as any, branches as any), users, branches };
}

describe('EmployeesService', () => {
  it('creates staff (never owners), pinned to the default branch when none is given, with a hashed password', async () => {
    const { service, users } = build();
    const created = await service.create('biz', { name: 'Ada', email: 'ada@x.ng', password: 'secret1' });
    expect(created.role).toBe(Role.STAFF);
    expect(created.branchId).toBe('b-main');
    const saved = users.create.mock.calls[0][0];
    expect(saved.passwordHash).toBeDefined();
    expect(saved.passwordHash).not.toBe('secret1');
    expect(created).not.toHaveProperty('passwordHash');
  });

  it('rejects a duplicate email', async () => {
    const { service } = build({ existingEmail: true });
    await expect(service.create('biz', { name: 'Ada', email: 'ada@x.ng', password: 'secret1' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects a branch that is not in the business', async () => {
    const { service } = build({ branch: null });
    await expect(
      service.create('biz', { name: 'Ada', email: 'ada@x.ng', password: 'secret1', branchId: 'foreign' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses to remove an owner or yourself, and 404s on unknown ids', async () => {
    const owner = { id: 'owner-1', role: Role.OWNER };
    await expect(build({ target: owner }).service.remove('biz', 'someone-else', 'owner-1')).rejects.toThrow(
      /Owner accounts cannot be removed/,
    );
    await expect(
      build({ target: { id: 'staff-1', role: Role.STAFF } }).service.remove('biz', 'staff-1', 'staff-1'),
    ).rejects.toThrow(/own account/);
    await expect(build().service.remove('biz', 'a', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('removes a staff member scoped to the business', async () => {
    const { service, users } = build({ target: { id: 'staff-1', role: Role.STAFF } });
    await service.remove('biz', 'owner-1', 'staff-1');
    expect(users.delete).toHaveBeenCalledWith({ id: 'staff-1', businessId: 'biz' });
  });
});
