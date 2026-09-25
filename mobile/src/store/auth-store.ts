import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Branch, Role } from '../api/types';

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
  token: string | null;
  business: AuthBusiness | null;
  user: AuthUser | null;
  branches: Branch[];
  /** Owner's selected branch; null means "all branches". Staff are pinned server-side. */
  activeBranchId: string | null;
  hasHydrated: boolean;
  setAuth: (payload: { token: string; business: AuthBusiness; user: AuthUser }) => void;
  setBranches: (branches: Branch[]) => void;
  setActiveBranch: (branchId: string | null) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

/** Accounts created before roles existed have no role and are owners. */
export const selectIsOwner = (s: AuthState) => s.user?.role !== 'staff';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      business: null,
      user: null,
      branches: [],
      activeBranchId: null,
      hasHydrated: false,
      setAuth: (payload) =>
        set({
          token: payload.token,
          business: payload.business,
          user: payload.user,
          branches: [],
          activeBranchId: null,
        }),
      setBranches: (branches) =>
        set((state) => ({
          branches,
          activeBranchId: branches.some((b) => b.id === state.activeBranchId) ? state.activeBranchId : null,
        })),
      setActiveBranch: (branchId) => set({ activeBranchId: branchId }),
      logout: () => set({ token: null, business: null, user: null, branches: [], activeBranchId: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'bizledger-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      partialize: (state) => ({
        token: state.token,
        business: state.business,
        user: state.user,
        branches: state.branches,
        activeBranchId: state.activeBranchId,
      }),
    },
  ),
);
