import axios, { InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { selectIsOwner, useAuthStore } from '../store/auth-store';
import { APP_VERSION, compareVersions, useAppStatus } from '../store/app-status-store';
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

export const apiBaseUrl = apiUrl;

export const apiClient = axios.create({
  baseURL: apiUrl,
  timeout: 15000,
});

/** Auth header for requests made outside axios (e.g. <Image> loading a product photo). */
export function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Start waking the server early (e.g. on app launch) so the first real request doesn't wait. */
export function warmUpServer() {
  void ensureServerAwake(apiUrl);
}

apiClient.interceptors.request.use(async (config) => {
  // If the server may have gone to sleep, wait for it to wake before sending,
  // rather than letting this request hit the normal 15s timeout.
  await ensureServerAwake(apiUrl);
  // Lets the server retire old app versions (426 Upgrade Required).
  config.headers['X-App-Version'] = APP_VERSION;
  config.headers['X-App-Platform'] = Platform.OS;
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
      if (error.response.status === 426) {
        const data = error.response.data as { minVersion?: string; updateUrl?: string } | undefined;
        useAppStatus.getState().requireUpdate({ minVersion: data?.minVersion, updateUrl: data?.updateUrl });
      }
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

// Server field names as people would say them, for validation messages.
const FIELD_NAMES: Record<string, string> = {
  costPrice: 'Cost price',
  sellingPrice: 'Selling price',
  stockQty: 'Stock quantity',
  lowStockThreshold: 'Low-stock alert level',
  businessName: 'Business name',
  ownerName: 'Your name',
  amountPaid: 'Amount paid',
  paymentMethod: 'Payment method',
  customerId: 'Customer',
  branchId: 'Branch',
  stockAdjustmentReason: 'Reason',
};

function humanise(message: string): string {
  // class-validator messages start with the property name, e.g. "costPrice must not be less than 0".
  const [first, ...rest] = message.split(' ');
  const friendly = FIELD_NAMES[first] ?? (first ? first[0].toUpperCase() + first.slice(1) : first);
  return [friendly, ...rest].join(' ').replace('must not be less than', 'must be at least').replace('should not be empty', 'is required');
}

/**
 * Turns any API failure into a sentence a business owner can act on. Raw
 * server errors (stack traces, SQL, "Internal server error") never reach the UI.
 */
export function apiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Something went wrong. Please try again.';
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? 'The server took too long to respond. Check your connection and try again.'
      : "Couldn't reach the server. Check your internet connection and try again.";
  }
  const { status } = error.response;
  const data = error.response.data as { message?: string | string[] } | undefined;
  const serverMessage = Array.isArray(data?.message) ? data!.message.map(humanise).join('\n') : data?.message;

  if (status === 401) return 'Your session has ended. Please sign in again.';
  if (status === 403) return "Your account doesn't have access to this. Ask the business owner.";
  if (status === 404) return serverMessage && serverMessage !== 'Not Found' ? serverMessage : "We couldn't find that. It may have been deleted.";
  if (status === 413) return 'That file is too large. Choose a smaller photo.';
  if (status === 426) return 'This version of BizLedger is no longer supported. Please update the app.';
  // Our own 429s explain themselves (e.g. how long a sign-in lockout lasts).
  if (status === 429) return serverMessage && !/ThrottlerException/.test(serverMessage) ? serverMessage : 'Too many attempts. Wait a moment and try again.';
  if (status === 503 && serverMessage) return serverMessage;
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  // 400/409: our API writes these messages for people, so show them (field names made readable).
  return serverMessage ? humanise(serverMessage) : 'Please check the details and try again.';
}

/**
 * Checks the server's minimum and latest app versions at launch. Public and
 * best-effort: if it fails, the app carries on (a 426 on any later request
 * still triggers the update screen).
 */
export async function checkAppVersion() {
  try {
    const { data } = await axios.get<{ minVersion: string | null; latestVersion: string | null; updateUrl: string | null }>(
      `${apiUrl}/app/config`,
      { timeout: 15000 },
    );
    const status = useAppStatus.getState();
    if (data.minVersion && compareVersions(APP_VERSION, data.minVersion) < 0) {
      status.requireUpdate({ minVersion: data.minVersion, updateUrl: data.updateUrl });
    } else if (data.latestVersion && compareVersions(APP_VERSION, data.latestVersion) < 0) {
      status.offerUpdate({ latestVersion: data.latestVersion, updateUrl: data.updateUrl });
    }
  } catch {
    // Offline or server asleep: not a reason to block anyone.
  }
}
