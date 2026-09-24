import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/auth-store';

// Android emulators need 10.0.2.2 to reach the host machine. iOS simulators
// and web preview can use localhost. Physical devices still need an explicit
// LAN IP via EXPO_PUBLIC_API_URL.
const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  defaultApiUrl;

export const apiClient = axios.create({
  baseURL: apiUrl,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data!.message.join(', ');
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  return 'Something went wrong. Please try again.';
}
