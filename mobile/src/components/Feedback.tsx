import { ComponentProps, useEffect, useRef } from 'react';
import { Alert, Animated, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { colors, radius, spacing } from '../theme';

/** Pulsing placeholder block shown while data loads. */
export function Skeleton({ width = '100%', height = 14, style }: { width?: ViewStyle['width']; height?: number; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius: radius.sm, backgroundColor: colors.border, opacity }, style]} />;
}

/** Skeleton for a card of list rows. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <Card accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton width={40} height={40} style={{ borderRadius: radius.md }} />
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
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeletonStat}>
          <Skeleton width="50%" height={12} />
          <Skeleton width="75%" height={22} />
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
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyProps) {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText tone="muted" align="center" style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} icon="add" style={styles.centered} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerMuted }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      </View>
      <AppText variant="heading" align="center">
        Something didn't load
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
  return (
    <View style={styles.inline}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <AppText variant="caption" tone="danger" style={{ flex: 1 }}>
        {message}
      </AppText>
      {onRetry ? <Button label="Retry" size="sm" variant="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppText variant="label" tone="primary" style={{ fontSize: size * 0.36 }}>
        {initials || '?'}
      </AppText>
    </View>
  );
}

/**
 * Yes/no confirmation. React Native's Alert does nothing on web, so fall back
 * to the browser dialog there.
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

const styles = StyleSheet.create({
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: spacing.xs },
  skeletonText: { flex: 1, gap: spacing.sm },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  skeletonStat: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
    marginBottom: spacing.xs,
  },
  message: { maxWidth: 320 },
  centered: { alignSelf: 'center', marginTop: spacing.sm },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.dangerMuted,
  },
  avatar: { backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
});
