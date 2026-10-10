import { BadRequestException } from '@nestjs/common';
import { AnalyticsService, bucketStart, fillDailySeries, fillSeries, lagosDay } from './analytics.service';

describe('lagosDay', () => {
  it('uses the Lagos wall-clock date, not UTC', () => {
    expect(lagosDay(new Date('2026-09-01T23:30:00Z'))).toBe('2026-09-02');
    expect(lagosDay(new Date('2026-09-01T22:30:00Z'))).toBe('2026-09-01');
  });
});

describe('fillDailySeries', () => {
  it('zero-fills days with no sales and keeps real days in order', () => {
    const out = fillDailySeries(
      [{ day: '2026-09-02', revenue: 500, profit: 200, saleCount: 3 }],
      new Date('2026-09-01T09:00:00Z'),
      new Date('2026-09-03T09:00:00Z'),
    );
    expect(out).toEqual([
      { day: '2026-09-01', revenue: 0, profit: 0, saleCount: 0 },
      { day: '2026-09-02', revenue: 500, profit: 200, saleCount: 3 },
      { day: '2026-09-03', revenue: 0, profit: 0, saleCount: 0 },
    ]);
  });
});

describe('AnalyticsService.getAnalytics', () => {
  const empty = () => ({ query: jest.fn().mockResolvedValue([]) });

  it('rejects an inverted, oversized or malformed range', async () => {
    const service = new AnalyticsService(empty() as any);
    await expect(service.getAnalytics('biz', '2026-09-10', '2026-09-01')).rejects.toThrow(BadRequestException);
    await expect(service.getAnalytics('biz', '2024-01-01', '2026-09-01')).rejects.toThrow(BadRequestException);
    await expect(service.getAnalytics('biz', 'nonsense')).rejects.toThrow(BadRequestException);
  });

  it('filters by branch only when one is given, and returns zeroed totals for an empty period', async () => {
    const ds = empty();
    const service = new AnalyticsService(ds as any);
    const result = await service.getAnalytics('biz', '2026-09-01', '2026-09-03');
    expect(result.totals).toEqual({ revenue: 0, profit: 0, saleCount: 0, averageSale: 0 });
    expect(result.daily).toHaveLength(3);
    expect(ds.query.mock.calls[0][1]).toHaveLength(3);

    const ds2 = empty();
    await new AnalyticsService(ds2 as any).getAnalytics('biz', '2026-09-01', '2026-09-03', 'branch-1');
    expect(ds2.query.mock.calls[0][1]).toEqual(['biz', expect.any(Date), expect.any(Date), 'branch-1']);
    expect(ds2.query.mock.calls[0][0]).toContain('"branchId" = $4');
  });
});

describe('time buckets', () => {
  it('matches Postgres date_trunc: weeks start Monday, months on the 1st', () => {
    expect(bucketStart('2026-09-24', 'week')).toBe('2026-09-21'); // Thursday -> Monday
    expect(bucketStart('2026-09-21', 'week')).toBe('2026-09-21'); // Monday stays
    expect(bucketStart('2026-09-27', 'week')).toBe('2026-09-21'); // Sunday -> previous Monday
    expect(bucketStart('2026-09-24', 'month')).toBe('2026-09-01');
    expect(bucketStart('2026-09-24', 'day')).toBe('2026-09-24');
  });

  it('zero-fills monthly buckets and merges expenses into the same bucket', () => {
    const out = fillSeries(
      [{ bucket: '2026-08-01', revenue: 100, profit: 40, saleCount: 2 }],
      [{ bucket: '2026-09-01', amount: 30 }],
      new Date('2026-07-15T12:00:00Z'),
      new Date('2026-09-20T12:00:00Z'),
      'month',
    );
    expect(out.map((p) => p.bucket)).toEqual(['2026-07-01', '2026-08-01', '2026-09-01']);
    expect(out[1]).toEqual({ bucket: '2026-08-01', revenue: 100, profit: 40, saleCount: 2, expenses: 0 });
    expect(out[2].expenses).toBe(30);
  });

  it('rejects an unknown granularity', async () => {
    const service = new AnalyticsService({ query: jest.fn().mockResolvedValue([]) } as any);
    await expect(service.getAnalytics('biz', '2026-09-01', '2026-09-03', undefined, 'year' as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns zeroed expense, customer and inventory-movement figures for an empty period', async () => {
    const service = new AnalyticsService({ query: jest.fn().mockResolvedValue([]) } as any);
    const r = await service.getAnalytics('biz', '2026-09-01', '2026-09-14', undefined, 'week');
    expect(r.series.map((p) => p.bucket)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14']); // Sept 14 is a Monday
    expect(r.expenses).toEqual({ total: 0, byCategory: [] });
    expect(r.customers).toEqual({ total: 0, active: 0, new: 0, returning: 0 });
    expect(r.inventoryMovement).toEqual({ unitsSold: 0, unitsAdded: 0, unitsRemoved: 0, adjustments: 0 });
    expect(r.netProfit).toBe(0);
  });
});
