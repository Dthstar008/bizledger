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

export type Role = 'owner' | 'staff';

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string | null;
  /** Absent for staff accounts — the API hides purchase costs from them. */
  costPrice?: number;
  sellingPrice: number;
  stockQty: number;
  lowStockThreshold: number;
  /** Set when the product has a photo; changes whenever the photo is replaced. */
  imageUpdatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  purchaseSummary: { saleCount: number; totalSpent: number; lastPurchaseAt: string | null };
  createdAt?: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCostPrice?: number;
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
  costTotal?: number;
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
  customerCount: number;
  lowStockProducts: Product[];
  insights: string[];
}

export interface Branch {
  id: string;
  name: string;
  address?: string | null;
  isDefault: boolean;
}

export interface Employee {
  id: string;
  name?: string;
  email: string;
  role: Role;
  branchId: string | null;
  createdAt: string;
}

export interface DailyPoint {
  day: string;
  revenue: number;
  profit: number;
  saleCount: number;
}

export type Granularity = 'day' | 'week' | 'month';

export interface SeriesPoint {
  bucket: string;
  revenue: number;
  profit: number;
  saleCount: number;
  expenses: number;
}

export interface Analytics {
  period: { from: string; to: string };
  granularity: Granularity;
  totals: { revenue: number; profit: number; saleCount: number; averageSale: number };
  netProfit: number;
  daily: DailyPoint[];
  series: SeriesPoint[];
  topProducts: { productId: string; name: string; units: number; revenue: number; profit: number }[];
  slowProducts: { productId: string; name: string; stock: number; units: number; revenue: number }[];
  topCustomers: { customerId: string; name: string; revenue: number; saleCount: number }[];
  paymentMix: { method: PaymentMethod; revenue: number; saleCount: number }[];
  expenses: { total: number; byCategory: { category: ExpenseCategory; amount: number; count: number }[] };
  customers: { total: number; active: number; new: number; returning: number };
  inventoryMovement: { unitsSold: number; unitsAdded: number; unitsRemoved: number; adjustments: number };
}

export type LedgerEventType =
  | 'SALE_CREATED'
  | 'PAYMENT_RECEIVED'
  | 'CUSTOMER_CREDIT_CREATED'
  | 'CUSTOMER_CREDIT_REPAID'
  | 'INVENTORY_DECREASED'
  | 'INVENTORY_ADJUSTED'
  | 'EXPENSE_CREATED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_DELETED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED'
  | 'CUSTOMER_DELETED';

/** One entry in the append-only business ledger. */
export interface LedgerEvent {
  id: string;
  type: LedgerEventType;
  amount?: number | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}
