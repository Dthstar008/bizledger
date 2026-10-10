import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Branch, Role } from '../api/types';
import { readToken, writeToken } from './token-storage';

interface AuthBusiness {
  id: string;
  name: string;
}

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: Role;
  branchId?: string | null;
}

interface AuthState {
  /** Kept in memory here; persisted only in secure storage (see token-storage). */
  token: string | null;
  business: AuthBusiness | null;
  user: AuthUser | null;
  branches: Branch[];
  /** Owner's selected branch; null means "all branches". Staff are pinned server-side. */
  activeBranchId: string | null;
  hasHydrated: boolean;
  setAuth: (payload: { token: string; business: AuthBusiness; user: AuthUser }) => void;
  /** Replace the token only, e.g. after a password change issues a new one. */
  setToken: (token: string) => void;
  setBranches: (branches: Branch[]) => void;
  setActiveBranch: (branchId: string | null) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

/** Accounts created before roles existed have no role and are owners. */
export const selectIsOwner = (s: AuthState) => s.user?.role !== 'staff';

type Persisted = Pick<AuthState, 'business' | 'user' | 'branches' | 'activeBranchId'> & { token?: string | null };

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      business: null,
      user: null,
      branches: [],
      activeBranchId: null,
      hasHydrated: false,
      setAuth: (payload) => {
        void writeToken(payload.token);
        set({
          token: payload.token,
          business: payload.business,
          user: payload.user,
          branches: [],
          activeBranchId: null,
        });
      },
      setToken: (token) => {
        void writeToken(token);
        set({ token });
      },
      setBranches: (branches) =>
        set((state) => ({
          branches,
          activeBranchId: branches.some((b) => b.id === state.activeBranchId) ? state.activeBranchId : null,
        })),
      setActiveBranch: (branchId) => set({ activeBranchId: branchId }),
      logout: () => {
        void writeToken(null);
        set({ token: null, business: null, user: null, branches: [], activeBranchId: null });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'bizledger-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Version 1 moved the token out of this (plain) storage.
      version: 1,
      migrate: async (persisted, version) => {
        const state = (persisted ?? {}) as Persisted;
        if (version < 1 && state.token) {
          await writeToken(state.token);
        }
        delete state.token;
        return state as unknown as AuthState;
      },
      partialize: (state) => ({
        business: state.business,
        user: state.user,
        branches: state.branches,
        activeBranchId: state.activeBranchId,
      }),
      // Only report "hydrated" once the token has been read from secure
      // storage, so the app never routes to login while it is still loading.
      onRehydrateStorage: () => (state) => {
        void readToken().then((token) => {
          if (token && state?.user) useAuthStore.setState({ token });
          useAuthStore.getState().setHasHydrated(true);
        });
      },
    },
  ),
);
