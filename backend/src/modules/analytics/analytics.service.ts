import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface DailyPoint {
  day: string;
  revenue: number;
  profit: number;
  saleCount: number;
}

const WAT_OFFSET_MS = 60 * 60 * 1000; // Africa/Lagos is UTC+1 year-round
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

/** YYYY-MM-DD of an instant as seen on a Lagos wall clock. */
export function lagosDay(date: Date): string {
  return new Date(date.getTime() + WAT_OFFSET_MS).toISOString().slice(0, 10);
}

/** One entry per calendar day in [from, to], zero-filled where nothing was sold, so charts have no gaps. */
export function fillDailySeries(rows: DailyPoint[], from: Date, to: Date): DailyPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: DailyPoint[] = [];
  const end = Date.parse(lagosDay(to));
  for (let t = Date.parse(lagosDay(from)); t <= end; t += DAY_MS) {
    const day = new Date(t).toISOString().slice(0, 10);
    out.push(byDay.get(day) ?? { day, revenue: 0, profit: 0, saleCount: 0 });
  }
  return out;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getAnalytics(businessId: string, fromRaw?: string, toRaw?: string, branchId?: string) {
    const to = toRaw ? new Date(toRaw) : new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(to.getTime() - 29 * DAY_MS);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException('Invalid date range');
    }
    if ((to.getTime() - from.getTime()) / DAY_MS > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    // Confirmed sales only; every query shares the same filter and parameters.
    const params: unknown[] = [businessId, from, to];
    let where = `s."businessId" = $1 AND s.status = 'confirmed' AND s."createdAt" >= $2 AND s."createdAt" <= $3`;
    if (branchId) {
      params.push(branchId);
      where += ` AND s."branchId" = $${params.length}`;
    }

    const [daily, topProducts, topCustomers, paymentMix, totals] = await Promise.all([
      this.dataSource.query(
        `SELECT (s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Lagos')::date::text AS day,
                COALESCE(SUM(s."totalAmount"), 0) AS revenue,
                COALESCE(SUM(s."totalAmount" - s."costTotal"), 0) AS profit,
                COUNT(s.id) AS "saleCount"
           FROM sales s WHERE ${where} GROUP BY 1 ORDER BY 1`,
        params,
      ),
      this.dataSource.query(
        `SELECT si."productId" AS "productId", si."productName" AS name,
                SUM(si.quantity) AS units,
                SUM(si."lineTotal") AS revenue,
                SUM(si."lineTotal" - si."unitCostPrice" * si.quantity) AS profit
           FROM sale_items si JOIN sales s ON s.id = si."saleId"
          WHERE ${where}
          GROUP BY si."productId", si."productName"
          ORDER BY revenue DESC LIMIT 5`,
        params,
      ),
      this.dataSource.query(
        `SELECT c.id AS "customerId", c.name AS name,
                SUM(s."totalAmount") AS revenue, COUNT(s.id) AS "saleCount"
           FROM sales s JOIN customers c ON c.id = s."customerId"
          WHERE ${where}
          GROUP BY c.id, c.name
          ORDER BY revenue DESC LIMIT 5`,
        params,
      ),
      this.dataSource.query(
        `SELECT s."paymentMethod" AS method, SUM(s."totalAmount") AS revenue, COUNT(s.id) AS "saleCount"
           FROM sales s WHERE ${where} GROUP BY s."paymentMethod" ORDER BY revenue DESC`,
        params,
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(s."totalAmount"), 0) AS revenue,
                COALESCE(SUM(s."totalAmount" - s."costTotal"), 0) AS profit,
                COUNT(s.id) AS "saleCount"
           FROM sales s WHERE ${where}`,
        params,
      ),
    ]);

    const num = (v: unknown) => Number(v ?? 0);
    const t = totals[0] ?? {};
    const saleCount = num(t.saleCount);

    return {
      period: { from, to },
      totals: {
        revenue: num(t.revenue),
        profit: num(t.profit),
        saleCount,
        averageSale: saleCount > 0 ? num(t.revenue) / saleCount : 0,
      },
      daily: fillDailySeries(
        daily.map((r: Record<string, unknown>) => ({
          day: String(r.day),
          revenue: num(r.revenue),
          profit: num(r.profit),
          saleCount: num(r.saleCount),
        })),
        from,
        to,
      ),
      topProducts: topProducts.map((r: Record<string, unknown>) => ({
        productId: r.productId,
        name: r.name,
        units: num(r.units),
        revenue: num(r.revenue),
        profit: num(r.profit),
      })),
      topCustomers: topCustomers.map((r: Record<string, unknown>) => ({
        customerId: r.customerId,
        name: r.name,
        revenue: num(r.revenue),
        saleCount: num(r.saleCount),
      })),
      paymentMix: paymentMix.map((r: Record<string, unknown>) => ({
        method: r.method,
        revenue: num(r.revenue),
        saleCount: num(r.saleCount),
      })),
    };
  }
}
