import { create } from 'zustand';
import Constants from 'expo-constants';

/** This build's version, from app.json; sent to the API on every request. */
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

interface AppStatus {
  /** The server no longer supports this version: block the app until it is updated. */
  updateRequired: boolean;
  /** A newer version exists but this one still works: a dismissible banner. */
  updateAvailable: boolean;
  bannerDismissed: boolean;
  minVersion: string | null;
  latestVersion: string | null;
  updateUrl: string | null;
  requireUpdate: (info: { minVersion?: string | null; updateUrl?: string | null }) => void;
  offerUpdate: (info: { latestVersion: string; updateUrl?: string | null }) => void;
  dismissBanner: () => void;
}

export const useAppStatus = create<AppStatus>()((set) => ({
  updateRequired: false,
  updateAvailable: false,
  bannerDismissed: false,
  minVersion: null,
  latestVersion: null,
  updateUrl: null,
  requireUpdate: ({ minVersion, updateUrl }) =>
    set((s) => ({ updateRequired: true, minVersion: minVersion ?? s.minVersion, updateUrl: updateUrl ?? s.updateUrl })),
  offerUpdate: ({ latestVersion, updateUrl }) =>
    set((s) => ({ updateAvailable: true, latestVersion, updateUrl: updateUrl ?? s.updateUrl })),
  dismissBanner: () => set({ bannerDismissed: true }),
}));

/** "1.10.0" > "1.9.3"; anything unparseable counts as 0.0.0. Mirrors the server's comparison. */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const parse = (v: string | null | undefined) => {
    const m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(v ?? '');
    return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : [0, 0, 0];
  };
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}
