import { NotFoundException } from '@nestjs/common';
import { Expense, ExpenseCategory, LedgerEventType } from '../../entities';
import { ExpensesService } from './expenses.service';

const actor = { userId: 'owner-1' };

function build(expense: Partial<Expense> | null) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(expense ? { ...expense } : null),
    save: jest.fn(async (e) => e),
    delete: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Expense) return repo;
      throw new Error('unexpected entity');
    }),
  };
  const dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)) };
  const ledgerService = { record: jest.fn().mockResolvedValue(undefined) };
  return { service: new ExpensesService({} as any, dataSource as any, ledgerService as any), repo, manager, ledgerService };
}

const existing: Partial<Expense> = {
  id: 'e1',
  businessId: 'biz',
  category: ExpenseCategory.TRANSPORT,
  amount: 3000,
  description: 'Trip to Computer Village',
  createdAt: new Date('2026-09-20T10:00:00Z'),
};

describe('ExpensesService.update', () => {
  it('records EXPENSE_UPDATED with before -> after inside the transaction', async () => {
    const { service, ledgerService, manager } = build(existing);
    await service.update('biz', 'e1', { amount: 3500, category: ExpenseCategory.TRANSPORT }, actor);
    const [businessId, type, amount, meta, usedManager] = ledgerService.record.mock.calls[0];
    expect(businessId).toBe('biz');
    expect(type).toBe(LedgerEventType.EXPENSE_UPDATED);
    expect(amount).toBe(3500);
    expect(meta.changes).toEqual({ amount: { from: 3000, to: 3500 } });
    expect(meta.actorId).toBe('owner-1');
    expect(usedManager).toBe(manager);
  });

  it('records nothing when nothing changed', async () => {
    const { service, ledgerService, repo } = build(existing);
    await service.update('biz', 'e1', { amount: 3000 }, actor);
    expect(ledgerService.record).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('404s for an expense outside the business', async () => {
    const { service } = build(null);
    await expect(service.update('biz', 'x', { amount: 1 })).rejects.toThrow(NotFoundException);
  });
});

describe('ExpensesService.remove', () => {
  it('deletes and records EXPENSE_DELETED keeping the amount and details', async () => {
    const { service, ledgerService, repo, manager } = build(existing);
    await service.remove('biz', 'e1', actor);
    expect(repo.delete).toHaveBeenCalledWith({ id: 'e1', businessId: 'biz' });
    expect(ledgerService.record).toHaveBeenCalledWith(
      'biz',
      LedgerEventType.EXPENSE_DELETED,
      3000,
      expect.objectContaining({ expenseId: 'e1', category: 'transport', description: 'Trip to Computer Village' }),
      manager,
    );
  });
});
