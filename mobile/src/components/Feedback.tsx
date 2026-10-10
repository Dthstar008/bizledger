import { ComponentProps, useEffect, useRef } from 'react';
import { Alert, Animated, Platform, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Colors, radius, spacing } from '../theme';
import { makeStyles, useTheme } from '../theming';

/** Cream placeholder block in the shape of the content that's loading (no spinners). */
export function Skeleton({ width = '100%', height = 14, style }: { width?: ViewStyle['width']; height?: number; style?: ViewStyle }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);
  return <Animated.View style={[{ width, height, borderRadius: radius.sm, backgroundColor: colors.border, opacity }, style]} />;
}

/** Skeleton for a card of list rows. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  const styles = useStyles();
  return (
    <Card accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton width={44} height={44} style={{ borderRadius: radius.md }} />
          <View style={styles.skeletonText}>
            <Skeleton width="60%" />
            <Skeleton width="35%" height={12} />
          </View>
          <Skeleton width={64} />
        </View>
      ))}
    </Card>
  );
}

/** Skeleton for a grid of stat cards. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  const styles = useStyles();
  return (
    <View style={styles.skeletonGrid} accessibilityLabel="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeletonStat}>
          <Skeleton width="50%" height={12} />
          <Skeleton width="75%" height={24} />
        </View>
      ))}
    </View>
  );
}

interface EmptyProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Icon on the action button (defaults to "add"). */
  actionIcon?: ComponentProps<typeof Ionicons>['name'];
}

/** Says what's missing and offers the next step. */
export function EmptyState({ icon, title, message, actionLabel, onAction, actionIcon = 'add' }: EmptyProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <View style={styles.iconTile}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText tone="muted" align="center" style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} icon={actionIcon} style={styles.centered} /> : null}
    </View>
  );
}

/** A screen whose data couldn't load at all: what happened, and a way to try again. */
export function ErrorState({ message, onRetry, title = "This didn't load" }: { message: string; onRetry?: () => void; title?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <View style={[styles.iconTile, { backgroundColor: colors.dangerMuted }]}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText tone="muted" align="center" style={styles.message}>
        {message}
      </AppText>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" icon="refresh" style={styles.centered} /> : null}
    </View>
  );
}

/** Inline banner for errors on a screen that still has (older) data to show. */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.inline} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <AppText variant="label" tone="danger" style={styles.flex}>
        {message}
      </AppText>
      {onRetry ? <Button label="Retry" size="sm" variant="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

// Green tints for avatar backgrounds, picked from the name so a customer keeps the same colour.
const AVATAR_TINTS: (keyof Colors)[] = ['primaryMuted', 'primarySoft', 'surfaceAlt', 'goldMuted'];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const tint = AVATAR_TINTS[hash % AVATAR_TINTS.length];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[tint] }]}>
      <AppText variant="bodyStrong" style={{ fontSize: size * 0.36, lineHeight: size * 0.46, color: tint === 'goldMuted' ? colors.goldDeep : colors.primaryPressed }}>
        {initials || '?'}
      </AppText>
    </View>
  );
}

/**
 * Yes/no confirmation. React Native's Alert does nothing on web, so fall back
 * to the browser dialog there. Financial confirmations restate the amount and
 * the person ("Clear ₦40,000 for Chinedu Okafor?").
 */
export function confirm(opts: { title: string; message: string; confirmLabel: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${opts.title}\n\n${opts.message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(opts.title, opts.message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: opts.confirmLabel, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

const useStyles = makeStyles((c) => ({
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: spacing.xs },
  skeletonText: { flex: 1, gap: spacing.sm },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skeletonStat: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  // Rounded tile echoing the app icon.
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primaryMuted,
    marginBottom: spacing.xs,
  },
  message: { maxWidth: 340 },
  centered: { alignSelf: 'center', marginTop: spacing.sm },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: c.dangerMuted,
  },
  flex: { flex: 1 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
}));
