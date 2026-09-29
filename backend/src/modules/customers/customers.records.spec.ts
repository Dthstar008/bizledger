import { ConflictException } from '@nestjs/common';
import { Customer, LedgerEventType, Sale, Transaction } from '../../entities';
import { CustomersService } from './customers.service';

const actor = { userId: 'staff-1', branchId: 'lekki' };

function build(opts: { customer?: Partial<Customer> | null; sales?: number; transactions?: number } = {}) {
  const customerRepo = {
    findOne: jest.fn().mockResolvedValue(opts.customer === undefined ? { id: 'c1', businessId: 'biz', name: 'Chinedu', phone: '0801' } : opts.customer),
    save: jest.fn(async (c) => ({ id: 'c1', ...c })),
    delete: jest.fn(),
  };
  const saleRepo = { count: jest.fn().mockResolvedValue(opts.sales ?? 0) };
  const txRepo = { count: jest.fn().mockResolvedValue(opts.transactions ?? 0) };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Customer) return customerRepo;
      if (entity === Sale) return saleRepo;
      if (entity === Transaction) return txRepo;
      throw new Error('unexpected entity');
    }),
  };
  const dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)) };
  const ledgerService = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new CustomersService(
    { create: (v: unknown) => v } as any,
    {} as any,
    {} as any,
    dataSource as any,
    ledgerService as any,
    {} as any,
  );
  return { service, customerRepo, manager, ledgerService };
}

describe('customer events', () => {
  it('create records CUSTOMER_CREATED in the same transaction', async () => {
    const { service, ledgerService, manager } = build();
    await service.create('biz', { name: 'Ada' }, actor);
    expect(ledgerService.record).toHaveBeenCalledWith(
      'biz',
      LedgerEventType.CUSTOMER_CREATED,
      undefined,
      expect.objectContaining({ customerId: 'c1', name: 'Ada', actorId: 'staff-1', branchId: 'lekki' }),
      manager,
    );
  });

  it('update records only the fields that changed', async () => {
    const { service, ledgerService } = build();
    await service.update('biz', 'c1', { name: 'Chinedu', phone: '0802' }, actor);
    const meta = ledgerService.record.mock.calls[0][3];
    expect(ledgerService.record.mock.calls[0][1]).toBe(LedgerEventType.CUSTOMER_UPDATED);
    expect(meta.changes).toEqual({ phone: { from: '0801', to: '0802' } });
  });

  it('refuses to delete a customer with sales or payments, and writes nothing', async () => {
    for (const history of [{ sales: 1 }, { transactions: 2 }]) {
      const { service, customerRepo, ledgerService } = build(history);
      await expect(service.remove('biz', 'c1', actor)).rejects.toThrow(ConflictException);
      expect(customerRepo.delete).not.toHaveBeenCalled();
      expect(ledgerService.record).not.toHaveBeenCalled();
    }
  });

  it('deletes a customer without history and records CUSTOMER_DELETED', async () => {
    const { service, customerRepo, ledgerService, manager } = build();
    await service.remove('biz', 'c1', actor);
    expect(customerRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: { mode: 'pessimistic_write' } }));
    expect(customerRepo.delete).toHaveBeenCalledWith({ id: 'c1', businessId: 'biz' });
    expect(ledgerService.record).toHaveBeenCalledWith('biz', LedgerEventType.CUSTOMER_DELETED, undefined, expect.objectContaining({ customerId: 'c1' }), manager);
  });
});
