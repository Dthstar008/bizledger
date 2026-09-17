import { apiClient } from './client';
import { Expense, ExpenseCategory } from './types';

export function listExpenses() {
  return apiClient.get<Expense[]>('/expenses').then((r) => r.data);
}

export function createExpense(payload: { category: ExpenseCategory; amount: number; description?: string }) {
  return apiClient.post<Expense>('/expenses', payload).then((r) => r.data);
}
