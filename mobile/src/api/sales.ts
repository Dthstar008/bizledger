import { apiClient } from './client';
import { PaymentMethod, Sale, TransactionChannel } from './types';

export function listSales() {
  return apiClient.get<Sale[]>('/sales').then((r) => r.data);
}

export function createSale(payload: {
  items: { productId: string; quantity: number; unitPrice?: number }[];
  paymentMethod: PaymentMethod;
  customerId?: string;
  amountPaid?: number;
  paymentReference?: string;
  channel?: TransactionChannel;
}) {
  return apiClient.post<Sale>('/sales', payload).then((r) => r.data);
}
