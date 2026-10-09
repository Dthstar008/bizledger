import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Card, Section } from '../../src/components/Card';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { ChipGroup } from '../../src/components/Chip';
import { TextField } from '../../src/components/TextField';
import { Badge } from '../../src/components/Badge';
import { ListRow } from '../../src/components/ListRow';
import { StatCard, StatGrid } from '../../src/components/StatCard';
import { ActivityItem } from '../../src/components/ActivityItem';
import { Avatar, ErrorState, InlineError, Skeleton, SkeletonList, confirm } from '../../src/components/Feedback';
import { addRepayment, deleteCustomer, getCustomer } from '../../src/api/customers';
import { listLedgerEvents } from '../../src/api/ledger';
import { apiErrorMessage } from '../../src/api/client';
import { CustomerDetail, TransactionChannel } from '../../src/api/types';
import { publish } from '../../src/events/bus';
import { useResource } from '../../src/hooks/useResource';
import { useTeamNames } from '../../src/hooks/useTeamNames';
import { selectIsOwner, useAuthStore } from '../../src/store/auth-store';
import { formatNaira } from '../../src/utils/currency';
import { formatDate, relativeTime } from '../../src/utils/format';
import { goBack } from '../../src/utils/navigation';
import { parseAmount } from '../../src/utils/validate';
import { buildDebtReminderText, openWhatsApp } from '../../src/utils/whatsapp';
import { colors, spacing } from '../../src/theme';

const CHANNELS: { value: TransactionChannel; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Transfer' },
  { value: 'pos', label: 'POS' },
  { value: 'opay', label: 'OPay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'other', label: 'Other' },
];
const channelLabel = (c: TransactionChannel) => CHANNELS.find((x) => x.value === c)?.label ?? c;

function RepaymentForm({ customer, onDone }: { customer: CustomerDetail; onDone: () => void }) {
  const [channel, setChannel] = useState<TransactionChannel>('cash');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = parseAmount(amount);
  const balance = customer.outstandingBalance;
  const invalid = value === null || value <= 0 ? 'Enter the amount received' : value > balance ? `They only owe ${formatNaira(balance)}` : null;

  async function save() {
    if (invalid || value === null) return;
    setSaving(true);
    setError(null);
    try {
      await addRepayment(customer.id, { amount: value, channel });
      publish({ type: 'payment.received', customerId: customer.id, amount: value });
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      {error ? <InlineError message={error} /> : null}
      <AppText variant="label" tone="muted">
        Received by
      </AppText>
      <ChipGroup options={CHANNELS} value={channel} onChange={setChannel} />
      <TextField
        label="Amount received"
        prefix="₦"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder={String(balance)}
        error={amount && invalid ? invalid : undefined}
        helper={!invalid && value !== null ? `Balance after this: ${formatNaira(balance - value)}` : undefined}
      />
      <Button label={`Fill full balance (${formatNaira(balance)})`} size="sm" variant="ghost" onPress={() => setAmount(String(balance))} />
      <View style={styles.row}>
        <Button label="Cancel" variant="secondary" onPress={onDone} style={styles.flexButton} />
        <Button label="Save" icon="checkmark" onPress={save} loading={saving} disabled={!!invalid} style={styles.flexButton} />
      </View>
    </View>
  );
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isOwner = useAuthStore(selectIsOwner);
  const businessName = useAuthStore((s) => s.business?.name ?? 'Your business');
  const actorName = useTeamNames();
  const [repaying, setRepaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const events = ['customer.changed', 'payment.received', 'sale.completed'] as const;
  const customer = useResource(() => getCustomer(id), [...events], [id], { key: `customer:${id}` });
  const activity = useResource(
    () => (isOwner ? listLedgerEvents({ entity: 'customer', entityId: id, limit: 20 }) : Promise.resolve([])),
    [...events],
    [id, isOwner],
  );

  async function remove() {
    const c = customer.data;
    if (!c) return;
    const ok = await confirm({
      title: `Delete ${c.name}?`,
      message: 'This removes them from your customer list.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteCustomer(c.id);
      publish({ type: 'customer.changed', customerId: c.id, change: 'deleted' });
      goBack('/(tabs)/customers');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (customer.loading) {
    return (
      <Screen edges={[]}>
        <Skeleton height={140} />
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  const c = customer.data;
  if (!c) {
    return (
      <Screen edges={[]}>
        <ErrorState message={customer.error ?? 'This customer could not be loaded.'} onRetry={customer.retry} />
      </Screen>
    );
  }

  const owes = c.outstandingBalance > 0;
  const summary = c.purchaseSummary;
  const openCredit = c.creditSales.filter((s) => s.paymentStatus !== 'paid');
  const edit = () => router.push({ pathname: '/customer/form', params: { id: c.id } });

  return (
    <Screen edges={[]} refreshing={customer.refreshing} onRefresh={customer.reload}>
      <Stack.Screen options={{ title: c.name }} />

      <Card style={styles.hero}>
        <View style={styles.identity}>
          <Avatar name={c.name} size={56} />
          <View style={styles.flex}>
            <AppText variant="title">{c.name}</AppText>
            <AppText variant="caption" tone="muted">
              {[c.phone || 'No phone number', c.createdAt ? `Customer since ${formatDate(c.createdAt, { month: 'short', year: 'numeric' })}` : null]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          </View>
        </View>
        <View style={styles.row}>
          {c.phone ? (
            <>
              <Button label="Call" icon="call-outline" size="sm" variant="secondary" onPress={() => Linking.openURL(`tel:${c.phone}`)} style={styles.flexButton} />
              <Button label="WhatsApp" icon="logo-whatsapp" size="sm" variant="secondary" onPress={() => openWhatsApp(`Hello ${c.name}, `, c.phone)} style={styles.flexButton} />
            </>
          ) : null}
          <Button label="Edit" icon="create-outline" size="sm" variant="secondary" onPress={edit} style={styles.flexButton} />
        </View>
      </Card>

      <StatGrid>
        <StatCard label="Owes you" value={owes ? formatNaira(c.outstandingBalance) : 'Nothing'} tone={owes ? 'negative' : 'default'} icon="alert-circle-outline" />
        <StatCard label="Total spent" value={formatNaira(summary.totalSpent)} icon="cash-outline" />
        <StatCard label="Purchases" value={String(summary.saleCount)} icon="receipt-outline" />
        <StatCard label="Last purchase" value={summary.lastPurchaseAt ? relativeTime(summary.lastPurchaseAt) : 'None yet'} icon="time-outline" />
      </StatGrid>

      {owes ? (
        <Section title="Outstanding balance" description={`${openCredit.length} credit sale${openCredit.length === 1 ? '' : 's'} not fully paid`}>
          {repaying ? (
            <RepaymentForm customer={c} onDone={() => setRepaying(false)} />
          ) : (
            <>
              <AppText variant="metric" style={styles.owed}>
                {formatNaira(c.outstandingBalance)}
              </AppText>
              <View style={styles.row}>
                <Button label="Record repayment" icon="cash-outline" onPress={() => setRepaying(true)} style={styles.flexButton} />
                <Button
                  label="Remind"
                  icon="logo-whatsapp"
                  variant="secondary"
                  onPress={() => openWhatsApp(buildDebtReminderText(businessName, c.name, c.outstandingBalance), c.phone)}
                  style={styles.flexButton}
                />
              </View>
              {openCredit.map((s, i) => (
                <ListRow
                  key={s.id}
                  title={`${formatNaira(s.outstandingBalance)} left of ${formatNaira(s.creditAmount)}`}
                  subtitle={`Credit sale · ${formatDate(s.createdAt)}`}
                  trailing={<Badge label={s.paymentStatus === 'partially_paid' ? 'Part paid' : 'Unpaid'} tone="warning" />}
                  last={i === openCredit.length - 1}
                />
              ))}
            </>
          )}
        </Section>
      ) : null}

      {isOwner ? (
        <Section title="Activity" description="Purchases, credit, repayments and edits">
          {activity.loading ? (
            <Skeleton height={60} />
          ) : (activity.data ?? []).length === 0 ? (
            <AppText tone="muted">Nothing recorded yet.</AppText>
          ) : (
            (activity.data ?? []).map((e, i, arr) => <ActivityItem key={e.id} event={e} actorName={actorName} last={i === arr.length - 1} />)
          )}
        </Section>
      ) : c.repayments.length > 0 ? (
        <Section title="Repayments">
          {c.repayments.map((r, i) => (
            <ListRow
              key={r.id}
              title={formatNaira(r.amount)}
              subtitle={`${channelLabel(r.channel)} · ${formatDate(r.createdAt)}`}
              last={i === c.repayments.length - 1}
            />
          ))}
        </Section>
      ) : null}

      {error ? <InlineError message={error} /> : null}
      {isOwner ? <Button label="Delete customer" icon="trash-outline" variant="destructive" onPress={remove} loading={deleting} style={styles.delete} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xxs },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  flexButton: { flex: 1, alignSelf: 'auto', minWidth: 96 },
  form: { gap: spacing.md },
  owed: { color: colors.danger },
  delete: { alignSelf: 'center' },
});
