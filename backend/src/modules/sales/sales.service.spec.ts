import { BadRequestException } from '@nestjs/common';
import { Product, Sale, SaleItem, Transaction, PaymentMethod, PaymentStatus, SaleStatus } from '../../entities';
import { SalesService, derivePaymentStatus } from './sales.service';

/** Builds a fake EntityManager whose getRepository() returns the right mock per entity, matching how SalesService.create() actually uses it. */
function buildManagerMocks(products: Partial<Product>[]) {
  const productRepo = { find: jest.fn().mockResolvedValue(products) };
  const saleRepo = {
    create: jest.fn((data: unknown) => data),
    save: jest.fn(async (data: any) => ({ ...data, id: 'sale-1' })),
  };
  const saleItemRepo = {
    insert: jest.fn(async (rows: unknown[]) => ({
      identifiers: rows.map((_, i) => ({ id: `item-${i}` })),
    })),
  };
  const transactionRepo = { insert: jest.fn().mockResolvedValue({}) };
  const query = jest.fn().mockResolvedValue(undefined);

  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Product) return productRepo;
      if (entity === Sale) return saleRepo;
      if (entity === SaleItem) return saleItemRepo;
      if (entity === Transaction) return transactionRepo;
      throw new Error(`buildManagerMocks: unexpected entity ${String(entity)}`);
    }),
    query,
  };

  return { manager, productRepo, saleRepo, saleItemRepo, transactionRepo, query };
}

function buildService(products: Partial<Product>[]) {
  const mocks = buildManagerMocks(products);
  const dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(mocks.manager)) };
  const ledgerService = { recordMany: jest.fn().mockResolvedValue(undefined), record: jest.fn() };
  const service = new SalesService({} as any, dataSource as any, ledgerService as any);
  return { service, ledgerService, ...mocks };
}

const CHARGER: Partial<Product> = {
  id: 'product-1',
  businessId: 'business-1',
  name: 'Oraimo Charger',
  costPrice: 6000,
  sellingPrice: 9000,
  stockQty: 10,
};

describe('SalesService', () => {
  it('summarizes a period with a single aggregate query', async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        revenue: '1200.50',
        grossProfit: '800.00',
        cashCollected: '900.00',
        creditIssued: '300.00',
        saleCount: '4',
      }),
    };

    const salesRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      find: jest.fn().mockRejectedValue(new Error('should not load all sales rows')),
    };

    const service = new SalesService(salesRepo as any, {} as any, {} as any);

    await expect(
      service.summarizeForPeriod('business-1', new Date('2024-01-01T00:00:00Z'), new Date('2024-01-31T23:59:59Z')),
    ).resolves.toEqual({
      revenue: 1200.5,
      grossProfit: 800,
      cashCollected: 900,
      creditIssued: 300,
      saleCount: 4,
    });

    expect(salesRepo.createQueryBuilder).toHaveBeenCalledWith('sale');
  });

  describe('create', () => {
    it('merges duplicate product lines into one stock lookup and one stock update', async () => {
      const { service, productRepo, query, ledgerService } = buildService([CHARGER]);

      const sale = await service.create('business-1', {
        items: [
          { productId: 'product-1', quantity: 2 },
          { productId: 'product-1', quantity: 2 },
        ],
        paymentMethod: PaymentMethod.CASH,
      } as any);

      // One lookup for the product, not one per line.
      expect(productRepo.find).toHaveBeenCalledTimes(1);
      // One UPDATE statement, not one per line — and it carries the merged
      // quantity (4), not two separate decrements of 2.
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][1]).toEqual(['business-1', 'product-1', 4]);

      // Both original lines are still present as separate sale items...
      expect(sale.items).toHaveLength(2);
      // ...but the ledger only records one merged inventory-decrease event.
      const ledgerCall = ledgerService.recordMany.mock.calls[0][0];
      const inventoryEvents = ledgerCall.filter((e: any) => e.type === 'INVENTORY_DECREASED');
      expect(inventoryEvents).toHaveLength(1);
      expect(inventoryEvents[0].metadata.quantity).toBe(4);

      expect(sale.totalAmount).toBe(4 * 9000);
      expect(sale.costTotal).toBe(4 * 6000);
    });

    it('rejects a sale whose merged quantity exceeds stock, without writing anything', async () => {
      const { service, query, saleRepo } = buildService([CHARGER]); // stock: 10

      await expect(
        service.create('business-1', {
          items: [
            { productId: 'product-1', quantity: 6 },
            { productId: 'product-1', quantity: 6 }, // merged: 12 > 10 in stock
          ],
          paymentMethod: PaymentMethod.CASH,
        } as any),
      ).rejects.toThrow(BadRequestException);

      // Validation happens before any write — nothing should have touched the DB.
      expect(query).not.toHaveBeenCalled();
      expect(saleRepo.save).not.toHaveBeenCalled();
    });

    it('marks a fully-paid cash sale as CONFIRMED / PAID', async () => {
      const { service } = buildService([CHARGER]);

      const sale = await service.create('business-1', {
        items: [{ productId: 'product-1', quantity: 1 }],
        paymentMethod: PaymentMethod.CASH,
      } as any);

      expect(sale.status).toBe(SaleStatus.CONFIRMED);
      expect(sale.paymentStatus).toBe(PaymentStatus.PAID);
      expect(sale.creditAmount).toBe(0);
    });

    it('marks a fully-unpaid credit sale as CREDIT, requiring a customer', async () => {
      const { service } = buildService([CHARGER]);

      await expect(
        service.create('business-1', {
          items: [{ productId: 'product-1', quantity: 1 }],
          paymentMethod: PaymentMethod.CREDIT,
          // no customerId
        } as any),
      ).rejects.toThrow(BadRequestException);

      const sale = await service.create('business-1', {
        items: [{ productId: 'product-1', quantity: 1 }],
        paymentMethod: PaymentMethod.CREDIT,
        customerId: 'customer-1',
      } as any);
      expect(sale.paymentStatus).toBe(PaymentStatus.CREDIT);
      expect(sale.creditAmount).toBe(9000);
    });

    it('marks a partially-paid credit sale as PARTIALLY_PAID', async () => {
      const { service } = buildService([CHARGER]);

      const sale = await service.create('business-1', {
        items: [{ productId: 'product-1', quantity: 1 }],
        paymentMethod: PaymentMethod.CREDIT,
        customerId: 'customer-1',
        amountPaid: 4000,
      } as any);

      expect(sale.paymentStatus).toBe(PaymentStatus.PARTIALLY_PAID);
      expect(sale.amountPaid).toBe(4000);
      expect(sale.creditAmount).toBe(5000);
    });
  });
});

describe('derivePaymentStatus', () => {
  it('is PAID when the sale had no credit portion', () => {
    expect(derivePaymentStatus(0, 0)).toBe(PaymentStatus.PAID);
  });

  it('is PAID once the outstanding balance is fully repaid', () => {
    expect(derivePaymentStatus(10000, 0)).toBe(PaymentStatus.PAID);
  });

  it('is CREDIT when nothing has been repaid yet', () => {
    expect(derivePaymentStatus(10000, 10000)).toBe(PaymentStatus.CREDIT);
  });

  it('is PARTIALLY_PAID between those two states', () => {
    expect(derivePaymentStatus(10000, 4000)).toBe(PaymentStatus.PARTIALLY_PAID);
  });
});
