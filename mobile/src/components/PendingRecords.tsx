import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { AppText } from './AppText';
import { Badge } from './Badge';
import { OutboxItem, useMyOutbox, useOutbox } from '../offline/outbox';
import { formatNaira } from '../utils/currency';
import { expenseCategory } from '../utils/expenses';
import { formatDateTime } from '../utils/format';
import { colors, radius, spacing } from '../theme';

export function outboxTitle(item: OutboxItem): string {
  if (item.kind === 'expense') return expenseCategory(item.payload.category).label;
  const [first, ...rest] = item.display.lines;
  if (!first) return 'Sale';
  const head = `${first.quantity} × ${first.productName}`;
  return rest.length ? `${head} + ${rest.length} more` : head;
}

export function outboxAmount(item: OutboxItem): number {
  return item.kind === 'sale' ? item.display.total : item.payload.amount;
}

/**
 * Sales or expenses saved on this phone that haven't reached the server yet,
 * shown at the top of their list so nothing looks lost. Tapping opens the
 * sync screen, where refused records can be retried or discarded.
 */
export function PendingRecords({ kind }: { kind: OutboxItem['kind'] }) {
  const items = useMyOutbox().filter((i) => i.kind === kind);
  const syncing = useOutbox((s) => s.syncing);
  if (items.length === 0) return null;
  const failed = items.filter((i) => i.status === 'failed').length;
  const noun = kind === 'sale' ? 'sale' : 'expense';

  return (
    <Card onPress={() => router.push('/sync')} accessibilityLabel={`${items.length} ${noun}s waiting to sync. Open sync details.`} style={styles.card}>
      <View style={styles.head}>
        <Ionicons name={failed ? 'alert-circle-outline' : 'cloud-upload-outline'} size={20} color={failed ? colors.danger : colors.warning} />
        <AppText variant="bodyStrong" style={styles.flex}>
          {items.length} {noun}
          {items.length === 1 ? '' : 's'} waiting to sync
        </AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
      </View>
      <AppText variant="caption" tone="muted">
        {failed
          ? `${failed} couldn't be saved by the server. Tap to review.`
          : syncing
            ? 'Sending now…'
            : 'Saved on this phone. They send automatically when you are back online.'}
      </AppText>
      {items.slice(0, 3).map((i) => (
        <View key={i.id} style={styles.row}>
          <View style={styles.flex}>
            <AppText numberOfLines={1}>{outboxTitle(i)}</AppText>
            <AppText variant="caption" tone="muted">
              {formatDateTime(i.occurredAt)}
            </AppText>
          </View>
          <View style={styles.right}>
            <AppText variant="bodyStrong">{formatNaira(outboxAmount(i))}</AppText>
            <Badge label={i.status === 'failed' ? 'Not synced' : 'Waiting'} tone={i.status === 'failed' ? 'danger' : 'warning'} />
          </View>
        </View>
      ))}
      {items.length > 3 ? (
        <AppText variant="caption" tone="primary">
          and {items.length - 3} more
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, borderColor: colors.warning, borderWidth: 1, borderRadius: radius.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  right: { alignItems: 'flex-end', gap: spacing.xs },
});
