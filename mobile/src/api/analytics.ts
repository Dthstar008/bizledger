import { apiClient } from './client';
import { Analytics } from './types';

export function getAnalytics(range: { from: Date; to: Date }) {
  return apiClient
    .get<Analytics>('/analytics', { params: { from: range.from.toISOString(), to: range.to.toISOString() } })
    .then((r) => r.data);
}
