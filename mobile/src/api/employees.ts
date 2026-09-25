import { apiClient } from './client';
import { Employee } from './types';

export function listEmployees() {
  return apiClient.get<Employee[]>('/employees').then((r) => r.data);
}

export function createEmployee(payload: { name: string; email: string; password: string; branchId?: string }) {
  return apiClient.post<Employee>('/employees', payload).then((r) => r.data);
}

export function removeEmployee(id: string) {
  return apiClient.delete(`/employees/${id}`).then(() => undefined);
}
