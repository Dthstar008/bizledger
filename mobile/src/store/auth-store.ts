import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthBusiness {
  id: string;
  name: string;
}

interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  business: AuthBusiness | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setAuth: (payload: { token: string; business: AuthBusiness; user: AuthUser }) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      business: null,
      user: null,
      hasHydrated: false,
      setAuth: (payload) => set({ token: payload.token, business: payload.business, user: payload.user }),
      logout: () => set({ token: null, business: null, user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'bizledger-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      partialize: (state) => ({ token: state.token, business: state.business, user: state.user }),
    },
  ),
);
