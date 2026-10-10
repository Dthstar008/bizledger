import { router } from 'expo-router';

type Fallback = '/(tabs)' | '/(tabs)/sales' | '/(tabs)/inventory' | '/(tabs)/customers' | '/(tabs)/expenses';

/** Back if there is somewhere to go back to (e.g. opened from a deep link there isn't), otherwise to `fallback`. */
export function goBack(fallback: Fallback) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
