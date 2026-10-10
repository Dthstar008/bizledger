import { LedgerEventType } from '../../entities';
import { LedgerService } from './ledger.service';

function build() {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const repo = { createQueryBuilder: jest.fn(() => qb) };
  return { service: new LedgerService(repo as any), qb };
}

describe('LedgerService.listForBusiness', () => {
  it('scopes to the business, newest first, default 50 and capped at 200', async () => {
    const { service, qb } = build();
    await service.listForBusiness('biz');
    expect(qb.where).toHaveBeenCalledWith('e.businessId = :businessId', { businessId: 'biz' });
    expect(qb.orderBy).toHaveBeenCalledWith('e.createdAt', 'DESC');
    expect(qb.take).toHaveBeenCalledWith(50);
    await service.listForBusiness('biz', { limit: 5000 });
    expect(qb.take).toHaveBeenLastCalledWith(200);
  });

  it("filters a product's history by the productId in event metadata", async () => {
    const { service, qb } = build();
    await service.listForBusiness('biz', { entity: 'product', entityId: 'p1' });
    expect(qb.andWhere).toHaveBeenCalledWith(`e.metadata->>'productId' = :entityId`, { entityId: 'p1' });
  });

  it("includes a customer's older sale events that predate customerId on events", async () => {
    const { service, qb } = build();
    await service.listForBusiness('biz', { entity: 'customer', entityId: 'c1' });
    const [sql, params] = qb.andWhere.mock.calls[0];
    expect(sql).toContain(`e.metadata->>'customerId' = :entityId`);
    expect(sql).toContain('FROM sales s WHERE s."customerId" = CAST(:entityId AS uuid) AND s."businessId" = :businessId');
    expect(params).toEqual({ entityId: 'c1' });
  });

  it('applies type and cursor filters', async () => {
    const { service, qb } = build();
    const before = new Date('2026-09-28T12:00:00Z');
    await service.listForBusiness('biz', { types: [LedgerEventType.INVENTORY_ADJUSTED], before });
    expect(qb.andWhere).toHaveBeenCalledWith('e.type IN (:...types)', { types: ['INVENTORY_ADJUSTED'] });
    expect(qb.andWhere).toHaveBeenCalledWith('e.createdAt < :before', { before });
  });
});
