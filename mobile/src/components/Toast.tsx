import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { AppEvent, subscribe } from '../events/bus';
import { formatNaira } from '../utils/currency';
import { colors, radius, shadow, spacing } from '../theme';

/** Every confirmation message comes from a domain event, so feedback is consistent everywhere. */
function messageFor(e: AppEvent): string | null {
  switch (e.type) {
    case 'sale.completed':
      // Synced records are announced together by outbox.synced.
      return e.fromSync ? null : `Sale recorded · ${formatNaira(e.sale.totalAmount)}`;
    case 'payment.received':
      return `Repayment of ${formatNaira(e.amount)} recorded`;
    case 'stock.adjusted':
      return `Stock ${e.delta > 0 ? 'increased' : 'reduced'} by ${Math.abs(e.delta)}`;
    case 'product.changed':
      return { created: 'Product added', updated: 'Product updated', deleted: 'Product deleted', photo: 'Photo updated' }[e.change];
    case 'customer.changed':
      return { created: 'Customer added', updated: 'Customer updated', deleted: 'Customer deleted' }[e.change];
    case 'expense.changed':
      if (e.fromSync) return null;
      return { created: 'Expense recorded', updated: 'Expense updated', deleted: 'Expense deleted' }[e.change];
    case 'team.changed':
      return 'Team updated';
    case 'outbox.queued':
      return `${e.kind === 'sale' ? 'Sale' : 'Expense'} saved on this phone · will sync when online`;
    case 'outbox.synced':
      return `${e.count} offline record${e.count === 1 ? '' : 's'} synced`;
    default:
      return null;
  }
}

const ALL: AppEvent['type'][] = [
  'sale.completed',
  'payment.received',
  'stock.adjusted',
  'product.changed',
  'customer.changed',
  'expense.changed',
  'team.changed',
  'outbox.queued',
  'outbox.synced',
];

export function EventToasts() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      subscribe(ALL, (e) => {
        const text = messageFor(e);
        if (!text) return;
        setMessage(text);
        if (timer.current) clearTimeout(timer.current);
        Animated.spring(anim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', friction: 8 }).start();
        timer.current = setTimeout(() => {
          Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start(() => setMessage(null));
        }, 2400);
      }),
    [anim],
  );

  if (!message) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 72 }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
        ]}
      >
        <Ionicons name="checkmark-circle" size={20} color={colors.primaryMuted} />
        <AppText variant="bodyStrong" tone="inverse" numberOfLines={2} style={{ flexShrink: 1 }}>
          {message}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 480,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.text,
    ...shadow.raised,
  },
});
