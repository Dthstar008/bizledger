import { apiBaseUrl, apiClient } from './client';
import { Role } from './types';

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; name?: string; role: Role; branchId: string | null };
  business: { id: string; name: string };
}

export function registerBusiness(payload: {
  businessName: string;
  ownerName?: string;
  phone?: string;
  email: string;
  password: string;
  confirmedAdult: boolean;
  acceptedTerms: boolean;
}) {
  return apiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data);
}

export function login(payload: { email: string; password: string }) {
  return apiClient.post<AuthResponse>('/auth/login', payload).then((r) => r.data);
}

/** Emails a 6-digit code. The answer is the same whether or not the account exists. */
export function requestPasswordReset(email: string) {
  return apiClient.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data);
}

export function resetPassword(payload: { email: string; code: string; newPassword: string }) {
  return apiClient.post<{ message: string }>('/auth/reset-password', payload).then((r) => r.data);
}

/** Returns a new session token; every other device is signed out. */
export function changePassword(payload: { currentPassword: string; newPassword: string }) {
  return apiClient.post<AuthResponse>('/auth/change-password', payload).then((r) => r.data);
}

/** Public pages served by the API (also the URLs given to app stores). */
export const legalUrls = {
  privacy: `${apiBaseUrl}/legal/privacy`,
  terms: `${apiBaseUrl}/legal/terms`,
};
