import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { selectOffline, useConnection } from '../offline/connection';
import { useMyOutbox, useOutbox } from '../offline/outbox';
import { useAuthStore } from '../store/auth-store';
import { colors, radius, spacing } from '../theme';

/**
 * One line at the top of each screen while something about the connection
 * matters: offline (lists show what's saved on the phone), records waiting
 * to sync, or records the server refused. Hidden otherwise.
 */
export function ConnectionBar({ style }: { style?: StyleProp<ViewStyle> }) {
  const offline = useConnection(selectOffline);
  const deviceOnline = useConnection((s) => s.deviceOnline);
  const signedIn = useAuthStore((s) => !!s.token);
  const items = useMyOutbox();
  const syncing = useOutbox((s) => s.syncing);
  if (!signedIn) return null;

  const failed = items.filter((i) => i.status === 'failed').length;
  const waiting = items.length - failed;
  let icon: 'cloud-offline-outline' | 'cloud-upload-outline' | 'alert-circle-outline';
  let text: string;
  let tone: 'warning' | 'danger' | 'muted' = 'warning';

  if (failed > 0) {
    icon = 'alert-circle-outline';
    tone = 'danger';
    text = `${failed} record${failed === 1 ? '' : 's'} couldn't sync. Tap to review.`;
  } else if (offline) {
    icon = 'cloud-offline-outline';
    text = `${deviceOnline ? "Can't reach the server" : "You're offline"}. Showing what's saved on this phone.${
      waiting ? ` ${waiting} waiting to sync.` : ' New sales and expenses will sync later.'
    }`;
  } else if (waiting > 0) {
    icon = 'cloud-upload-outline';
    tone = 'muted';
    text = syncing ? `Syncing ${waiting} record${waiting === 1 ? '' : 's'}…` : `${waiting} record${waiting === 1 ? '' : 's'} waiting to sync.`;
  } else {
    return null;
  }

  const bar = (
    <View style={[styles.bar, tone === 'danger' ? styles.danger : tone === 'muted' ? styles.neutral : styles.warning]}>
      <Ionicons name={icon} size={18} color={tone === 'danger' ? colors.danger : tone === 'muted' ? colors.textMuted : colors.warning} />
      <AppText variant="caption" tone={tone === 'muted' ? 'muted' : tone} style={styles.text}>
        {text}
      </AppText>
      {items.length > 0 ? <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} /> : null}
    </View>
  );
  return (
    <View style={style} accessibilityLiveRegion="polite">
      {items.length === 0 ? (
        bar
      ) : (
        <Pressable onPress={() => router.push('/sync')} accessibilityRole="button" accessibilityLabel={text} style={({ pressed }) => pressed && styles.pressed}>
          {bar}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm + 4, borderRadius: radius.md },
  warning: { backgroundColor: colors.warningMuted },
  danger: { backgroundColor: colors.dangerMuted },
  neutral: { backgroundColor: colors.surfaceAlt },
  text: { flex: 1 },
  pressed: { opacity: 0.7 },
});
