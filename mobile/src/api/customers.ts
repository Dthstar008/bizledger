import { apiClient } from './client';
import { Customer, CustomerDetail, Repayment, TransactionChannel } from './types';

export function listCustomers() {
  return apiClient.get<Customer[]>('/customers').then((r) => r.data);
}

export function getCustomer(id: string) {
  return apiClient.get<CustomerDetail>(`/customers/${id}`).then((r) => r.data);
}

export function createCustomer(payload: { name: string; phone?: string }) {
  return apiClient.post<Customer>('/customers', payload).then((r) => r.data);
}

export function updateCustomer(id: string, payload: { name?: string; phone?: string }) {
  return apiClient.patch<Customer>(`/customers/${id}`, payload).then((r) => r.data);
}

/** Owner only. Refused (409) when the customer has any sales or payments on record. */
export function deleteCustomer(id: string) {
  return apiClient.delete(`/customers/${id}`).then(() => undefined);
}

export function addRepayment(
  customerId: string,
  payload: { amount: number; channel: TransactionChannel; reference?: string; note?: string },
) {
  return apiClient.post<Repayment[]>(`/customers/${customerId}/repayments`, payload).then((r) => r.data);
}
