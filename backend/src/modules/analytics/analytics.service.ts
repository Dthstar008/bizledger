import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface DailyPoint {
  day: string;
  revenue: number;
  profit: number;
  saleCount: number;
}

export type Granularity = 'day' | 'week' | 'month';
export const GRANULARITIES: Granularity[] = ['day', 'week', 'month'];

export interface SeriesPoint {
  /** First day of the bucket (YYYY-MM-DD, Lagos calendar). Weeks start on Monday. */
  bucket: string;
  revenue: number;
  profit: number;
  saleCount: number;
  expenses: number;
}

const WAT_OFFSET_MS = 60 * 60 * 1000; // Africa/Lagos is UTC+1 year-round
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const LAGOS = `AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Lagos'`;

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

/** Start of the bucket containing a Lagos calendar day, matching Postgres date_trunc (weeks start Monday). */
export function bucketStart(day: string, granularity: Granularity): string {
  if (granularity === 'day') return day;
  if (granularity === 'month') return `${day.slice(0, 7)}-01`;
  const t = Date.parse(day);
  const weekday = new Date(t).getUTCDay(); // 0 = Sunday
  return new Date(t - ((weekday + 6) % 7) * DAY_MS).toISOString().slice(0, 10);
}

function nextBucket(bucket: string, granularity: Granularity): string {
  const d = new Date(Date.parse(bucket));
  if (granularity === 'day') d.setUTCDate(d.getUTCDate() + 1);
  else if (granularity === 'week') d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** Every bucket from `from` to `to`, zero-filled, merging sales and expense rows. */
export function fillSeries(
  sales: { bucket: string; revenue: number; profit: number; saleCount: number }[],
  expenses: { bucket: string; amount: number }[],
  from: Date,
  to: Date,
  granularity: Granularity,
): SeriesPoint[] {
  const s = new Map(sales.map((r) => [r.bucket, r]));
  const e = new Map(expenses.map((r) => [r.bucket, r.amount]));
  const out: SeriesPoint[] = [];
  const last = bucketStart(lagosDay(to), granularity);
  for (let b = bucketStart(lagosDay(from), granularity); b <= last; b = nextBucket(b, granularity)) {
    const row = s.get(b);
    out.push({
      bucket: b,
      revenue: row?.revenue ?? 0,
      profit: row?.profit ?? 0,
      saleCount: row?.saleCount ?? 0,
      expenses: e.get(b) ?? 0,
    });
  }
  return out;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getAnalytics(businessId: string, fromRaw?: string, toRaw?: string, branchId?: string, granularity: Granularity = 'day') {
    const to = toRaw ? new Date(toRaw) : new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(to.getTime() - 29 * DAY_MS);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException('Invalid date range');
    }
    if ((to.getTime() - from.getTime()) / DAY_MS > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }
    if (!GRANULARITIES.includes(granularity)) {
      throw new BadRequestException('granularity must be day, week or month');
    }

    // Confirmed sales only; every sales query shares the same filter and parameters.
    const params: unknown[] = [businessId, from, to];
    let where = `s."businessId" = $1 AND s.status = 'confirmed' AND s."createdAt" >= $2 AND s."createdAt" <= $3`;
    let expenseWhere = `e."businessId" = $1 AND e."createdAt" >= $2 AND e."createdAt" <= $3`;
    if (branchId) {
      params.push(branchId);
      where += ` AND s."branchId" = $${params.length}`;
      expenseWhere += ` AND e."branchId" = $${params.length}`;
    }
    // `granularity` is validated against a fixed list above, so it is safe to inline.
    const saleBucket = `date_trunc('${granularity}', s."createdAt" ${LAGOS})::date::text`;
    const expenseBucket = `date_trunc('${granularity}', e."createdAt" ${LAGOS})::date::text`;

    const [daily, topProducts, topCustomers, paymentMix, totals, salesSeries, expenseSeries, expenseByCategory, slowProducts, customerStats, movement] =
      await Promise.all([
        this.dataSource.query(
          `SELECT (s."createdAt" ${LAGOS})::date::text AS day,
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
                  SUM(si."lineTotal" - si."unitCostPrice" * si.quantity) AS profit,
                  MAX(p."imageUpdatedAt") AS "imageUpdatedAt"
             FROM sale_items si JOIN sales s ON s.id = si."saleId"
             LEFT JOIN products p ON p.id = si."productId"
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
        this.dataSource.query(
          `SELECT ${saleBucket} AS bucket,
                  COALESCE(SUM(s."totalAmount"), 0) AS revenue,
                  COALESCE(SUM(s."totalAmount" - s."costTotal"), 0) AS profit,
                  COUNT(s.id) AS "saleCount"
             FROM sales s WHERE ${where} GROUP BY 1 ORDER BY 1`,
          params,
        ),
        this.dataSource.query(
          `SELECT ${expenseBucket} AS bucket, COALESCE(SUM(e.amount), 0) AS amount
             FROM expenses e WHERE ${expenseWhere} GROUP BY 1 ORDER BY 1`,
          params,
        ),
        this.dataSource.query(
          `SELECT e.category AS category, SUM(e.amount) AS amount, COUNT(e.id) AS count
             FROM expenses e WHERE ${expenseWhere} GROUP BY e.category ORDER BY amount DESC`,
          params,
        ),
        // LEFT JOIN from products so items that didn't sell at all show up as slow movers.
        this.dataSource.query(
          `SELECT p.id AS "productId", p.name AS name, p."stockQty" AS stock, p."imageUpdatedAt" AS "imageUpdatedAt",
                  COALESCE(x.units, 0) AS units, COALESCE(x.revenue, 0) AS revenue
             FROM products p
             LEFT JOIN (
               SELECT si."productId", SUM(si.quantity) AS units, SUM(si."lineTotal") AS revenue
                 FROM sale_items si JOIN sales s ON s.id = si."saleId"
                WHERE ${where}
                GROUP BY si."productId"
             ) x ON x."productId" = p.id
            WHERE p."businessId" = $1
            ORDER BY units ASC, p.name ASC
            LIMIT 5`,
          params,
        ),
        this.dataSource.query(
          `WITH active AS (
             SELECT DISTINCT s."customerId" FROM sales s WHERE ${where} AND s."customerId" IS NOT NULL
           ), firsts AS (
             SELECT s2."customerId", MIN(s2."createdAt") AS first_at
               FROM sales s2
              WHERE s2."businessId" = $1 AND s2.status = 'confirmed' AND s2."customerId" IN (SELECT "customerId" FROM active)
              GROUP BY s2."customerId"
           )
           SELECT (SELECT COUNT(*) FROM active) AS active,
                  (SELECT COUNT(*) FROM firsts WHERE first_at >= $2) AS "new",
                  (SELECT COUNT(*) FROM customers c WHERE c."businessId" = $1) AS total`,
          params,
        ),
        // Derived from the event ledger: stock is one business-wide pool, so this isn't branch-filtered.
        this.dataSource.query(
          `SELECT
             COALESCE(SUM((metadata->>'quantity')::int) FILTER (WHERE type = 'INVENTORY_DECREASED'), 0) AS "unitsSold",
             COALESCE(SUM((metadata->>'delta')::int) FILTER (WHERE type = 'INVENTORY_ADJUSTED' AND (metadata->>'delta')::int > 0), 0) AS "unitsAdded",
             COALESCE(-SUM((metadata->>'delta')::int) FILTER (WHERE type = 'INVENTORY_ADJUSTED' AND (metadata->>'delta')::int < 0), 0) AS "unitsRemoved",
             COUNT(*) FILTER (WHERE type = 'INVENTORY_ADJUSTED') AS adjustments
             FROM ledger_events
            WHERE "businessId" = $1 AND "createdAt" >= $2 AND "createdAt" <= $3
              AND type IN ('INVENTORY_DECREASED', 'INVENTORY_ADJUSTED')`,
          [businessId, from, to],
        ),
      ]);

    const num = (v: unknown) => Number(v ?? 0);
    const t = totals[0] ?? {};
    const saleCount = num(t.saleCount);
    const expenseTotal = (expenseByCategory as Record<string, unknown>[]).reduce((sum, r) => sum + num(r.amount), 0);
    const cs = customerStats[0] ?? {};
    const mv = movement[0] ?? {};

    return {
      period: { from, to },
      granularity,
      totals: {
        revenue: num(t.revenue),
        profit: num(t.profit),
        saleCount,
        averageSale: saleCount > 0 ? num(t.revenue) / saleCount : 0,
      },
      netProfit: num(t.profit) - expenseTotal,
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
      series: fillSeries(
        salesSeries.map((r: Record<string, unknown>) => ({
          bucket: String(r.bucket),
          revenue: num(r.revenue),
          profit: num(r.profit),
          saleCount: num(r.saleCount),
        })),
        expenseSeries.map((r: Record<string, unknown>) => ({ bucket: String(r.bucket), amount: num(r.amount) })),
        from,
        to,
        granularity,
      ),
      topProducts: topProducts.map((r: Record<string, unknown>) => ({
        productId: r.productId,
        name: r.name,
        units: num(r.units),
        revenue: num(r.revenue),
        profit: num(r.profit),
        imageUpdatedAt: r.imageUpdatedAt ?? null,
      })),
      slowProducts: slowProducts.map((r: Record<string, unknown>) => ({
        productId: r.productId,
        name: r.name,
        stock: num(r.stock),
        units: num(r.units),
        revenue: num(r.revenue),
        imageUpdatedAt: r.imageUpdatedAt ?? null,
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
      expenses: {
        total: expenseTotal,
        byCategory: expenseByCategory.map((r: Record<string, unknown>) => ({
          category: r.category,
          amount: num(r.amount),
          count: num(r.count),
        })),
      },
      customers: {
        total: num(cs.total),
        active: num(cs.active),
        new: num(cs.new),
        returning: Math.max(0, num(cs.active) - num(cs.new)),
      },
      inventoryMovement: {
        unitsSold: num(mv.unitsSold),
        unitsAdded: num(mv.unitsAdded),
        unitsRemoved: num(mv.unitsRemoved),
        adjustments: num(mv.adjustments),
      },
    };
  }
}
