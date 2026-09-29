import axios, { InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { selectIsOwner, useAuthStore } from '../store/auth-store';
import { ensureServerAwake, markServerContact } from './server-status';

const HOSTED_API_URL = 'https://bizledger-api-iitk.onrender.com';

// In development, Android emulators need 10.0.2.2 to reach the host machine
// and iOS simulators/web can use localhost (physical devices set an explicit
// LAN IP via EXPO_PUBLIC_API_URL). A release build must never fall back to
// those, since they don't exist on a real phone, so it uses the hosted API.
const defaultApiUrl = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000'
  : HOSTED_API_URL;

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  defaultApiUrl;

export const apiClient = axios.create({
  baseURL: apiUrl,
  timeout: 15000,
});

/** Start waking the server early (e.g. on app launch) so the first real request doesn't wait. */
export function warmUpServer() {
  void ensureServerAwake(apiUrl);
}

apiClient.interceptors.request.use(async (config) => {
  // If the server may have gone to sleep, wait for it to wake before sending,
  // rather than letting this request hit the normal 15s timeout.
  await ensureServerAwake(apiUrl);
  const state = useAuthStore.getState();
  if (state.token) {
    config.headers.Authorization = `Bearer ${state.token}`;
  }
  // Owners pick a branch to work in; staff are pinned by the server, which ignores this header for them.
  if (state.activeBranchId && selectIsOwner(state)) {
    config.headers['X-Branch-Id'] = state.activeBranchId;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    markServerContact();
    return response;
  },
  async (error) => {
    if (error.response) {
      markServerContact();
      if (error.response.status === 401) {
        useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }

    // No response at all: timeout or network drop, possibly the server fell
    // asleep mid-session. Only reads are retried: a timed-out write may still
    // have been processed, and replaying it could record a sale twice.
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (config && !config._retried && (config.method ?? 'get').toLowerCase() === 'get') {
      config._retried = true;
      await ensureServerAwake(apiUrl, true);
      return apiClient(config);
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data!.message.join(', ');
    if (data?.message) return data.message;
    if (!error.response) return "Couldn't reach the server. Check your internet connection and try again.";
    if (error.message) return error.message;
  }
  return 'Something went wrong. Please try again.';
}
