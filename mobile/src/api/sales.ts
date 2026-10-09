import { AxiosRequestConfig } from 'axios';
import { apiClient } from './client';
import { PaymentMethod, Sale, TransactionChannel } from './types';

export function listSales() {
  return apiClient.get<Sale[]>('/sales').then((r) => r.data);
}

export interface SaleInput {
  items: { productId: string; quantity: number; unitPrice?: number }[];
  paymentMethod: PaymentMethod;
  customerId?: string;
  amountPaid?: number;
  paymentReference?: string;
  channel?: TransactionChannel;
}

/**
 * `clientRef` makes the request safe to repeat: the server stores a sale
 * once per clientRef. `occurredAt` is when a sale saved offline was made.
 */
export function createSale(payload: SaleInput & { clientRef?: string; occurredAt?: string }, config?: AxiosRequestConfig) {
  return apiClient.post<Sale>('/sales', payload, config).then((r) => r.data);
}
