import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../src/components/Screen';
import { Card, Section } from '../src/components/Card';
import { AppText } from '../src/components/AppText';
import { Badge } from '../src/components/Badge';
import { Button } from '../src/components/Button';
import { EmptyState, confirm } from '../src/components/Feedback';
import { outboxAmount, outboxTitle } from '../src/components/PendingRecords';
import { selectOffline, useConnection } from '../src/offline/connection';
import { discardOutboxItem, METHOD_LABEL, OutboxItem, retryOutboxItem, syncOutbox, useMyOutbox, useOutbox } from '../src/offline/outbox';
import { formatNaira } from '../src/utils/currency';
import { formatDateTime } from '../src/utils/format';
import { colors, spacing } from '../src/theme';

function ItemCard({ item }: { item: OutboxItem }) {
  const [busy, setBusy] = useState(false);
  const failed = item.status === 'failed';
  const detail =
    item.kind === 'sale'
      ? [METHOD_LABEL[item.payload.paymentMethod], item.display.customerName].filter(Boolean).join(' · ')
      : (item.payload.description ?? 'Expense');

  async function retry() {
    setBusy(true);
    try {
      await retryOutboxItem(item.id);
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    const ok = await confirm({
      title: `Discard this ${item.kind}?`,
      message:
        item.kind === 'sale'
          ? `${formatNaira(outboxAmount(item))} will not be recorded, and its stock will not be taken off. Only do this if the sale didn't really happen or you've recorded it another way.`
          : `${formatNaira(outboxAmount(item))} will not be recorded.`,
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (ok) discardOutboxItem(item.id);
  }

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Ionicons name={item.kind === 'sale' ? 'receipt-outline' : 'wallet-outline'} size={20} color={colors.primary} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {outboxTitle(item)}
          </AppText>
          <AppText variant="caption" tone="muted">
            {detail} · {formatDateTime(item.occurredAt)}
          </AppText>
        </View>
        <View style={styles.right}>
          <AppText variant="bodyStrong">{formatNaira(outboxAmount(item))}</AppText>
          <Badge label={failed ? 'Not synced' : 'Waiting'} tone={failed ? 'danger' : 'warning'} />
        </View>
      </View>
      {failed && item.error ? (
        <AppText variant="caption" tone="danger">
          {item.error}
        </AppText>
      ) : null}
      {failed ? (
        <View style={styles.actions}>
          <Button label="Discard" variant="secondary" size="sm" onPress={discard} style={styles.flexButton} />
          <Button label="Try again" icon="refresh" size="sm" onPress={retry} loading={busy} style={styles.flexButton} />
        </View>
      ) : null}
    </Card>
  );
}

/** Everything recorded on this phone that hasn't reached the server yet. */
export default function SyncScreen() {
  const items = useMyOutbox();
  const syncing = useOutbox((s) => s.syncing);
  const offline = useConnection(selectOffline);
  const failed = items.filter((i) => i.status === 'failed');
  const waiting = items.filter((i) => i.status === 'pending');

  if (items.length === 0) {
    return (
      <Screen edges={[]} connectionBar={false}>
        <EmptyState icon="cloud-done-outline" title="Everything is synced" message="All your sales and expenses have reached the server." />
      </Screen>
    );
  }

  return (
    <Screen edges={[]} connectionBar={false}>
      <AppText tone="muted">
        {offline
          ? "You're offline. These are saved on this phone and will send automatically when you're back online. Don't log out until they have synced."
          : 'These are saved on this phone and are being sent to the server.'}
      </AppText>

      {failed.length > 0 ? (
        <Section title={`Couldn't sync (${failed.length})`} card={false}>
          <AppText variant="caption" tone="muted">
            The server refused these. Fix the problem (for example, update the stock count in Inventory) and try again, or discard the record.
          </AppText>
          {failed.map((i) => (
            <ItemCard key={i.id} item={i} />
          ))}
        </Section>
      ) : null}

      {waiting.length > 0 ? (
        <Section title={`Waiting to sync (${waiting.length})`} card={false}>
          {waiting.map((i) => (
            <ItemCard key={i.id} item={i} />
          ))}
          <Button label={syncing ? 'Syncing…' : 'Sync now'} icon="cloud-upload-outline" onPress={() => void syncOutbox()} loading={syncing} disabled={offline} fullWidth />
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flexButton: { flex: 1, alignSelf: 'auto' },
});
