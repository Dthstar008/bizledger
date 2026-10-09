import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

interface PrefsState {
  hasSeenOnboarding: boolean;
  themePreference: ThemePreference;
  hasHydrated: boolean;
  markOnboardingSeen: () => void;
  setThemePreference: (value: ThemePreference) => void;
}

/** Device-level preferences that survive logout (unlike the auth store). */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      themePreference: 'system',
      hasHydrated: false,
      markOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      setThemePreference: (value) => set({ themePreference: value }),
    }),
    {
      name: 'bizledger-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ hasSeenOnboarding: s.hasSeenOnboarding, themePreference: s.themePreference }),
      onRehydrateStorage: () => () => usePrefs.setState({ hasHydrated: true }),
    },
  ),
);
