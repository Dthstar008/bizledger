import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** A short success tap for "recorded / settled" moments. Silent on the web and where unsupported. */
export function successHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

/** A light tick for steppers and selections. */
export function selectionHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => undefined);
}
