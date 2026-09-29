import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PrefsState {
  hasSeenOnboarding: boolean;
  hasHydrated: boolean;
  markOnboardingSeen: () => void;
}

/** Device-level preferences that survive logout (unlike the auth store). */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      hasHydrated: false,
      markOnboardingSeen: () => set({ hasSeenOnboarding: true }),
    }),
    {
      name: 'bizledger-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ hasSeenOnboarding: s.hasSeenOnboarding }),
      onRehydrateStorage: () => () => usePrefs.setState({ hasHydrated: true }),
    },
  ),
);
