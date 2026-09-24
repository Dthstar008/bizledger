export type PaymentMethod = 'cash' | 'transfer' | 'pos' | 'credit';

export type SaleStatus = 'draft' | 'confirmed' | 'cancelled' | 'refunded';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'credit';

/** More specific than PaymentMethod — which rail the money actually moved through. */
export type TransactionChannel = 'cash' | 'bank_transfer' | 'pos' | 'opay' | 'palmpay' | 'other';

export type ExpenseCategory =
  | 'rent'
  | 'transport'
  | 'salary'
  | 'utilities'
  | 'supplies'
  | 'maintenance'
  | 'other';

export interface Product {
  id: string;
  name: string;
  sku?: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  lowStockThreshold: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  outstandingBalance: number;
}

export interface Repayment {
  id: string;
  saleId?: string;
  channel: TransactionChannel;
  amount: number;
  reference?: string;
  verified: boolean;
  note?: string;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  creditSales: Sale[];
  repayments: Repayment[];
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCostPrice: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  amountPaid: number;
  creditAmount: number;
  outstandingBalance: number;
  costTotal: number;
  paymentReference?: string;
  verified: boolean;
  confirmedAt?: string;
  createdAt: string;
  customer?: { id: string; name: string } | null;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  createdAt: string;
}

export interface DashboardSummary {
  period: { from: string; to: string };
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  cash: number;
  inventoryValue: number;
  outstandingCustomerDebt: number;
  saleCount: number;
  lowStockProducts: Product[];
  insights: string[];
}
