import { Product, Sale, SaleItem, Transaction, PaymentMethod } from '../../entities';
import { SalesService } from './sales.service';

const CHARGER: Partial<Product> = {
  id: 'product-1',
  businessId: 'business-1',
  name: 'Oraimo Charger',
  costPrice: 6000,
  sellingPrice: 9000,
  stockQty: 10,
};
const CLIENT_REF = '6f1c2b1e-8d4a-4c2e-9f3b-2a7d5e9c1b40';

function build(existing: Partial<Sale> | null = null) {
  const saleRepo = {
    create: jest.fn((data: unknown) => data),
    save: jest.fn(async (data: any) => ({ ...data, id: 'sale-1' })),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Product) return { find: jest.fn().mockResolvedValue([CHARGER]) };
      if (entity === Sale) return saleRepo;
      if (entity === SaleItem) return { insert: jest.fn(async (rows: unknown[]) => ({ identifiers: rows.map((_, i) => ({ id: `item-${i}` })) })) };
      if (entity === Transaction) return { insert: jest.fn().mockResolvedValue({}) };
      throw new Error('unexpected entity');
    }),
    query: jest.fn().mockResolvedValue(undefined),
  };
  const sales = { findOne: jest.fn().mockResolvedValue(existing) };
  const dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown): Promise<unknown> => cb(manager) as Promise<unknown>) };
  const ledgerService = { recordMany: jest.fn().mockResolvedValue(undefined) };
  const service = new SalesService(sales as any, dataSource as any, ledgerService as any);
  return { service, sales, saleRepo, dataSource, ledgerService, manager };
}

const dto = {
  items: [{ productId: 'product-1', quantity: 2 }],
  paymentMethod: PaymentMethod.CASH,
  clientRef: CLIENT_REF,
};

describe('SalesService offline sync', () => {
  it('returns the stored sale when the same clientRef arrives again, without touching stock or the ledger', async () => {
    const stored = { id: 'sale-1', clientRef: CLIENT_REF, totalAmount: 18000 } as Partial<Sale>;
    const { service, dataSource, ledgerService, sales } = build(stored);

    const result = await service.create('business-1', dto);

    expect(result).toBe(stored);
    expect(sales.findOne).toHaveBeenCalledWith({ where: { businessId: 'business-1', clientRef: CLIENT_REF }, relations: ['items', 'customer'] });
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(ledgerService.recordMany).not.toHaveBeenCalled();
  });

  it('stores the clientRef and the time the sale was made offline, and marks its ledger events', async () => {
    const { service, saleRepo, ledgerService } = build(null);
    const madeAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    await service.create('business-1', { ...dto, occurredAt: madeAt });

    const saved = saleRepo.save.mock.calls[0][0];
    expect(saved.clientRef).toBe(CLIENT_REF);
    expect(saved.createdAt.toISOString()).toBe(madeAt);
    expect(saved.confirmedAt.toISOString()).toBe(madeAt);
    const events = ledgerService.recordMany.mock.calls[0][0] as { metadata: Record<string, unknown> }[];
    expect(events.every((e) => e.metadata.recordedOffline === true)).toBe(true);
  });

  it('returns the winner when a duplicate loses the race on the unique index', async () => {
    const { service, sales, dataSource } = build(null);
    const winner = { id: 'sale-9', clientRef: CLIENT_REF } as Partial<Sale>;
    dataSource.transaction.mockRejectedValueOnce(Object.assign(new Error('duplicate key'), { code: '23505' }));
    sales.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);

    await expect(service.create('business-1', dto)).resolves.toBe(winner);
  });

  it('records an online sale (no occurredAt) at server time without the offline flag', async () => {
    const { service, saleRepo, ledgerService } = build(null);
    const before = Date.now();

    await service.create('business-1', { items: dto.items, paymentMethod: PaymentMethod.CASH });

    const saved = saleRepo.save.mock.calls[0][0];
    expect(saved.clientRef).toBeNull();
    expect(saved.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    const events = ledgerService.recordMany.mock.calls[0][0] as { metadata: Record<string, unknown> }[];
    expect(events.some((e) => 'recordedOffline' in e.metadata)).toBe(false);
  });
});
