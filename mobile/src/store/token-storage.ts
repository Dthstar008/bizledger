import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The session token lives in the phone's secure storage (Android Keystore /
 * iOS Keychain), not in ordinary app storage where a rooted or backed-up
 * device could read it. Web has no secure store, so the web preview used in
 * development falls back to AsyncStorage (localStorage).
 */
const KEY = 'bizledger.session-token';
const useSecure = Platform.OS !== 'web';

export async function readToken(): Promise<string | null> {
  try {
    return useSecure ? await SecureStore.getItemAsync(KEY) : await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function writeToken(token: string | null): Promise<void> {
  try {
    if (token) {
      if (useSecure) await SecureStore.setItemAsync(KEY, token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
      else await AsyncStorage.setItem(KEY, token);
    } else if (useSecure) {
      await SecureStore.deleteItemAsync(KEY);
    } else {
      await AsyncStorage.removeItem(KEY);
    }
  } catch {
    // Storage failures shouldn't crash the app; the user just signs in again next launch.
  }
}
