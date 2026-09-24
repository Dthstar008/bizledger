import { apiClient } from './client';

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; name?: string };
  business: { id: string; name: string };
}

export function registerBusiness(payload: {
  businessName: string;
  ownerName?: string;
  phone?: string;
  email: string;
  password: string;
  confirmedAdult: boolean;
}) {
  return apiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data);
}

export function login(payload: { email: string; password: string }) {
  return apiClient.post<AuthResponse>('/auth/login', payload).then((r) => r.data);
}
