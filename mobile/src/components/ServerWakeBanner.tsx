import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useServerStatus } from '../api/server-status';
import { radius, spacing } from '../theme';
import { makeStyles } from '../theming';

/** Shown while the hosted server is waking from sleep, instead of letting requests time out. */
export function ServerWakeBanner() {
  const styles = useStyles();
  const state = useServerStatus((s) => s.state);
  const insets = useSafeAreaInsets();
  if (state !== 'waking') return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + spacing.sm }]}>
      <View style={styles.banner}>
        <ActivityIndicator color="#fff" size="small" />
        <Text style={styles.text}>Waking up the server… this can take up to a minute.</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
}));
