import { BadRequestException } from '@nestjs/common';
import { Customer, Sale, Transaction, PaymentStatus } from '../../entities';
import { CustomersService } from './customers.service';

/** A fake outstanding sale, mutable the same way the real Sale entity is by applyRepayment(). */
function makeSale(id: string, outstandingBalance: number, totalAmount: number): Sale {
  return { id, outstandingBalance, totalAmount, paymentStatus: PaymentStatus.CREDIT } as Sale;
}

function buildService(outstandingSales: Sale[]) {
  const customerRepo = {}; // unused directly by addRepayment — customer lookup goes through manager.findOne
  const salesRepo = {};
  const transactionsRepo = {};

  const transactionInsertRepo = {
    insert: jest.fn(async (rows: any[]) => ({
      identifiers: rows.map((_, i) => ({ id: `txn-${i}` })),
    })),
  };

  const manager = {
    findOne: jest.fn().mockResolvedValue({ id: 'customer-1', businessId: 'business-1' } as Customer),
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Transaction) return transactionInsertRepo;
      throw new Error(`unexpected entity ${String(entity)}`);
    }),
  };

  const dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)) };
  const ledgerService = { recordMany: jest.fn().mockResolvedValue(undefined), record: jest.fn() };

  // Mirrors the real SalesService.applyRepayment()'s effect closely enough
  // to make FIFO-allocation assertions meaningful, without re-testing
  // derivePaymentStatus itself (that's covered in sales.service.spec.ts).
  const applyRepayment = jest.fn(async (sale: Sale, amount: number) => {
    sale.outstandingBalance = Math.max(0, sale.outstandingBalance - amount);
    sale.paymentStatus =
      sale.outstandingBalance <= 0
        ? PaymentStatus.PAID
        : sale.outstandingBalance >= sale.totalAmount
          ? PaymentStatus.CREDIT
          : PaymentStatus.PARTIALLY_PAID;
    return sale;
  });

  const salesService = {
    findOutstandingForCustomer: jest.fn().mockResolvedValue(outstandingSales),
    applyRepayment,
  };

  const service = new CustomersService(
    customerRepo as any,
    salesRepo as any,
    transactionsRepo as any,
    dataSource as any,
    ledgerService as any,
    salesService as any,
  );

  return { service, applyRepayment, transactionInsertRepo, ledgerService };
}

describe('CustomersService.addRepayment', () => {
  it('allocates a repayment across outstanding sales oldest-first, in one bulk insert', async () => {
    const saleA = makeSale('sale-a', 3000, 3000); // oldest, fully outstanding
    const saleB = makeSale('sale-b', 5000, 9000); // newer, fully outstanding
    const { service, applyRepayment, transactionInsertRepo, ledgerService } = buildService([saleA, saleB]);

    const created = await service.addRepayment('business-1', 'customer-1', {
      amount: 6000,
      channel: 'cash',
    } as any);

    // sale-a fully cleared (3000), remaining 3000 applied to sale-b.
    expect(applyRepayment).toHaveBeenNthCalledWith(1, saleA, 3000, expect.anything());
    expect(applyRepayment).toHaveBeenNthCalledWith(2, saleB, 3000, expect.anything());
    expect(saleA.outstandingBalance).toBe(0);
    expect(saleA.paymentStatus).toBe(PaymentStatus.PAID);
    expect(saleB.outstandingBalance).toBe(2000);
    expect(saleB.paymentStatus).toBe(PaymentStatus.PARTIALLY_PAID);

    expect(created).toHaveLength(2);
    expect(created.map((t) => ({ saleId: t.saleId, amount: t.amount }))).toEqual([
      { saleId: 'sale-a', amount: 3000 },
      { saleId: 'sale-b', amount: 3000 },
    ]);

    // Batched, not one round trip per sale touched.
    expect(transactionInsertRepo.insert).toHaveBeenCalledTimes(1);
    expect(ledgerService.recordMany).toHaveBeenCalledTimes(1);
    expect(ledgerService.recordMany.mock.calls[0][0]).toHaveLength(2);
  });

  it('stops once the repayment is exhausted, leaving later sales untouched', async () => {
    const saleA = makeSale('sale-a', 3000, 3000);
    const saleB = makeSale('sale-b', 5000, 5000);
    const { service, applyRepayment } = buildService([saleA, saleB]);

    const created = await service.addRepayment('business-1', 'customer-1', {
      amount: 3000,
      channel: 'cash',
    } as any);

    expect(applyRepayment).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(1);
    expect(saleB.outstandingBalance).toBe(5000); // untouched
  });

  it('rejects a repayment exceeding the total outstanding balance, without writing anything', async () => {
    const saleA = makeSale('sale-a', 3000, 3000);
    const saleB = makeSale('sale-b', 5000, 5000);
    const { service, applyRepayment, transactionInsertRepo } = buildService([saleA, saleB]);

    await expect(
      service.addRepayment('business-1', 'customer-1', { amount: 9000, channel: 'cash' } as any),
    ).rejects.toThrow(BadRequestException);

    expect(applyRepayment).not.toHaveBeenCalled();
    expect(transactionInsertRepo.insert).not.toHaveBeenCalled();
  });
});
