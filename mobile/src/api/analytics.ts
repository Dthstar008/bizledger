import { apiClient } from './client';
import { Analytics, Granularity } from './types';

export function getAnalytics(range: { from: Date; to: Date; granularity?: Granularity }) {
  return apiClient
    .get<Analytics>('/analytics', {
      params: { from: range.from.toISOString(), to: range.to.toISOString(), granularity: range.granularity ?? 'day' },
    })
    .then((r) => r.data);
}
