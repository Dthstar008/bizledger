import { Injectable } from '@nestjs/common';
import { SalesService } from '../sales/sales.service';
import { ExpensesService } from '../expenses/expenses.service';
import { ProductsService } from '../products/products.service';
import { CustomersService } from '../customers/customers.service';

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly salesService: SalesService,
    private readonly expensesService: ExpensesService,
    private readonly productsService: ProductsService,
    private readonly customersService: CustomersService,
  ) {}

  async getSummary(businessId: string, from?: Date, to?: Date) {
    const now = to ?? new Date();
    const periodStart = from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const periodLengthMs = now.getTime() - periodStart.getTime();
    const previousPeriodEnd = new Date(periodStart.getTime() - 1);
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLengthMs);

    const [current, previous, expenses, previousExpenses, inventoryValue, lowStock, outstandingDebt] =
      await Promise.all([
        this.salesService.summarizeForPeriod(businessId, periodStart, now),
        this.salesService.summarizeForPeriod(businessId, previousPeriodStart, previousPeriodEnd),
        this.expensesService.totalForPeriod(businessId, periodStart, now),
        this.expensesService.totalForPeriod(businessId, previousPeriodStart, previousPeriodEnd),
        this.productsService.totalStockValue(businessId),
        this.productsService.lowStock(businessId),
        this.customersService.totalOutstandingDebt(businessId),
      ]);

    const netProfit = current.grossProfit - expenses;
    const cash = current.cashCollected - expenses;

    const insights: string[] = [];
    if (lowStock.length > 0) {
      insights.push(
        lowStock.length === 1
          ? `${lowStock[0].name} is running low on stock`
          : `${lowStock.length} products are running low on stock`,
      );
    }
    const revenueChange = percentChange(current.revenue, previous.revenue);
    if (revenueChange !== null && Math.abs(revenueChange) >= 1) {
      insights.push(`Revenue ${revenueChange >= 0 ? 'increased' : 'decreased'} ${Math.abs(revenueChange).toFixed(0)}% vs the previous period`);
    }
    const creditChange = percentChange(current.creditIssued, previous.creditIssued);
    if (creditChange !== null && Math.abs(creditChange) >= 1) {
      insights.push(`Customer credit issued ${creditChange >= 0 ? 'increased' : 'decreased'} ${Math.abs(creditChange).toFixed(0)}% vs the previous period`);
    }

    return {
      period: { from: periodStart, to: now },
      revenue: current.revenue,
      grossProfit: current.grossProfit,
      expenses,
      netProfit,
      cash,
      inventoryValue,
      outstandingCustomerDebt: outstandingDebt,
      saleCount: current.saleCount,
      lowStockProducts: lowStock,
      insights,
    };
  }
}
