import { apiClient } from './client';
import { DashboardSummary } from './types';

export function getDashboardSummary() {
  return apiClient.get<DashboardSummary>('/dashboard/summary').then((r) => r.data);
}
