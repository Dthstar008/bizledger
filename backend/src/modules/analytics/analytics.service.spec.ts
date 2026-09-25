import { BadRequestException } from '@nestjs/common';
import { AnalyticsService, fillDailySeries, lagosDay } from './analytics.service';

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
