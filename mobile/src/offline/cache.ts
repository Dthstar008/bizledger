import AsyncStorage from '@react-native-async-storage/async-storage';
import { selectIsOwner, useAuthStore } from '../store/auth-store';

/**
 * The last copy of each list the app loaded (products, customers, sales...),
 * saved on the phone so screens still work without a connection. Keys are
 * scoped to the business, the signed-in user and the selected branch, so one
 * account never sees another's saved data; everything is cleared on log out.
 */
const PREFIX = 'bizledger.cache.v1:';

export interface Cached<T> {
  data: T;
  savedAt: number;
}

function scopedKey(name: string): string | null {
  const s = useAuthStore.getState();
  if (!s.business || !s.user) return null;
  const branch = selectIsOwner(s) ? (s.activeBranchId ?? 'all') : 'own';
  return `${PREFIX}${s.business.id}:${s.user.id}:${branch}:${name}`;
}

export async function readCache<T>(name: string): Promise<Cached<T> | null> {
  const key = scopedKey(name);
  if (!key) return null;
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Cached<T>) : null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(name: string, data: T): Promise<void> {
  const key = scopedKey(name);
  if (!key) return;
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() } satisfies Cached<T>));
  } catch {
    // Storage full or unavailable: the app still works online, just without the offline copy.
  }
}

export async function clearCache(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    // Nothing more to do; keys are scoped per user anyway.
  }
}
