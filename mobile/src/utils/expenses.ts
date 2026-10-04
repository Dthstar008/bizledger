import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { ExpenseCategory } from '../api/types';

type Icon = ComponentProps<typeof Ionicons>['name'];

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: Icon }[] = [
  { value: 'supplies', label: 'Supplies', icon: 'cube-outline' },
  { value: 'rent', label: 'Rent', icon: 'home-outline' },
  { value: 'transport', label: 'Transport', icon: 'car-outline' },
  { value: 'salary', label: 'Salary', icon: 'people-outline' },
  { value: 'utilities', label: 'Utilities', icon: 'flash-outline' },
  { value: 'maintenance', label: 'Maintenance', icon: 'construct-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

export function expenseCategory(value: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}
