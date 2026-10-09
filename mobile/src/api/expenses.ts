import { AxiosRequestConfig } from 'axios';
import { apiClient } from './client';
import { Expense, ExpenseCategory } from './types';

export interface ExpenseInput {
  category: ExpenseCategory;
  amount: number;
  description?: string;
}

export function listExpenses() {
  return apiClient.get<Expense[]>('/expenses').then((r) => r.data);
}

export function getExpense(id: string) {
  return apiClient.get<Expense>(`/expenses/${id}`).then((r) => r.data);
}

/** Same sync fields as createSale: safe to repeat with the same clientRef. */
export function createExpense(payload: ExpenseInput & { clientRef?: string; occurredAt?: string }, config?: AxiosRequestConfig) {
  return apiClient.post<Expense>('/expenses', payload, config).then((r) => r.data);
}

export function updateExpense(id: string, payload: Partial<ExpenseInput>) {
  return apiClient.patch<Expense>(`/expenses/${id}`, payload).then((r) => r.data);
}

export function deleteExpense(id: string) {
  return apiClient.delete(`/expenses/${id}`).then(() => undefined);
}
