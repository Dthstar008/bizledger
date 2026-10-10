import { apiClient } from './client';
import { Branch } from './types';

export function listBranches() {
  return apiClient.get<Branch[]>('/branches').then((r) => r.data);
}

export function createBranch(payload: { name: string; address?: string }) {
  return apiClient.post<Branch>('/branches', payload).then((r) => r.data);
}
