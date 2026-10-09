import { ComponentProps, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { PageHeader } from '../../src/components/PageHeader';
import { Button } from '../../src/components/Button';
import { IconButton } from '../../src/components/IconButton';
import { Card } from '../../src/components/Card';
import { ChipGroup } from '../../src/components/Chip';
import { SearchBar } from '../../src/components/SearchBar';
import { StatCard, StatGrid } from '../../src/components/StatCard';
import { AppText } from '../../src/components/AppText';
import { Badge, BadgeTone } from '../../src/components/Badge';
import { EmptyState, ErrorState, InlineError, SkeletonList, SkeletonStats } from '../../src/components/Feedback';
import { listSales } from '../../src/api/sales';
import { PaymentMethod, PaymentStatus, Sale } from '../../src/api/types';
import { useResource } from '../../src/hooks/useResource';
import { PendingRecords } from '../../src/components/PendingRecords';
import { selectIsOwner, useAuthStore } from '../../src/store/auth-store';
import { formatNaira } from '../../src/utils/currency';
import { dayHeading, dayKey } from '../../src/utils/format';
import { colors, radius, spacing } from '../../src/theme';

type Filter = 'all' | 'paid' | 'owing' | 'unverified';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'owing', label: 'Owing' },
  { value: 'unverified', label: 'Unverified' },
];

const METHOD_ICON: Record<PaymentMethod, ComponentProps<typeof Ionicons>['name']> = {
  cash: 'cash-outline',
  transfer: 'swap-horizontal-outline',
  pos: 'card-outline',
  credit: 'time-outline',
};
const METHOD_LABEL: Record<PaymentMethod, string> = { cash: 'Cash', transfer: 'Transfer', pos: 'POS', credit: 'Credit' };
const STATUS: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: 'Paid', tone: 'success' },
  partially_paid: { label: 'Part paid', tone: 'warning' },
  credit: { label: 'On credit', tone: 'warning' },
  unpaid: { label: 'Unpaid', tone: 'danger' },
};

/** Only transfers and POS can be unconfirmed; cash is counted in hand and credit has no payment to verify. */
const needsVerification = (s: Sale) => !s.verified && (s.paymentMethod === 'transfer' || s.paymentMethod === 'pos');

function itemsSummary(sale: Sale): string {
  const [first, ...rest] = sale.items;
  if (!first) return 'Sale';
  const head = `${first.quantity} × ${first.productName}`;
  return rest.length ? `${head} + ${rest.length} more` : head;
}

function SaleRow({ sale, last }: { sale: Sale; last: boolean }) {
  const status = STATUS[sale.paymentStatus] ?? STATUS.paid;
  const time = new Date(sale.createdAt).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
  const subtitle = [sale.customer?.name, METHOD_LABEL[sale.paymentMethod], time].filter(Boolean).join(' · ');
  const content = (
    <View style={[styles.row, !last && styles.separator]}>
      <View style={styles.icon}>
        <Ionicons name={METHOD_ICON[sale.paymentMethod]} size={18} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {itemsSummary(sale)}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {subtitle}
        </AppText>
        {sale.outstandingBalance > 0 ? (
          <AppText variant="caption" tone="warning">
            {formatNaira(sale.outstandingBalance)} still owed
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>
        <AppText variant="bodyStrong">{formatNaira(sale.totalAmount)}</AppText>
        <View style={styles.badges}>
          {needsVerification(sale) ? <Badge label="Unverified" tone="neutral" /> : null}
          <Badge label={status.label} tone={status.tone} />
        </View>
      </View>
    </View>
  );
  if (!sale.customer) return content;
  return (
    <Card
      onPress={() => router.push({ pathname: '/customer/[id]', params: { id: sale.customer!.id } })}
      style={styles.rowPress}
      accessibilityLabel={`${itemsSummary(sale)}, ${formatNaira(sale.totalAmount)}, ${sale.customer.name}`}
    >
      {content}
    </Card>
  );
}

export default function SalesScreen() {
  const isOwner = useAuthStore(selectIsOwner);
  const branchId = useAuthStore((s) => s.user?.branchId);
  const branches = useAuthStore((s) => s.branches);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { data, error, loading, refreshing, reload, retry } = useResource(listSales, ['sale.completed', 'payment.received', 'branch.selected'], [], {
    key: 'sales',
    // Enough for today's and this month's figures without filling the phone.
    trim: (list) => list.slice(0, 300),
  });

  const stats = useMemo(() => {
    const now = new Date();
    const today = dayKey(now.toISOString());
    let todayTotal = 0;
    let todayCount = 0;
    let monthTotal = 0;
    let monthCount = 0;
    for (const s of data ?? []) {
      const d = new Date(s.createdAt);
      if (dayKey(s.createdAt) === today) {
        todayTotal += s.totalAmount;
        todayCount++;
      }
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        monthTotal += s.totalAmount;
        monthCount++;
      }
    }
    return { todayTotal, todayCount, monthTotal, monthCount };
  }, [data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((s) => {
      if (filter === 'paid' && s.paymentStatus !== 'paid') return false;
      if (filter === 'owing' && s.outstandingBalance <= 0) return false;
      if (filter === 'unverified' && !needsVerification(s)) return false;
      if (!q) return true;
      return (
        s.items.some((i) => i.productName.toLowerCase().includes(q)) ||
        (s.customer?.name ?? '').toLowerCase().includes(q) ||
        (s.paymentReference ?? '').toLowerCase().includes(q)
      );
    });
  }, [data, query, filter]);

  const groups = useMemo(() => {
    const out: { key: string; label: string; sales: Sale[] }[] = [];
    for (const s of visible) {
      const k = dayKey(s.createdAt);
      const g = out[out.length - 1];
      if (g && g.key === k) g.sales.push(s);
      else out.push({ key: k, label: dayHeading(s.createdAt), sales: [s] });
    }
    return out;
  }, [visible]);

  const staffBranch = !isOwner ? branches.find((b) => b.id === branchId)?.name : undefined;
  const header = (
    <PageHeader
      title="Sales"
      subtitle={staffBranch ? `Recording at ${staffBranch}` : 'Every sale you have recorded'}
      actions={
        <>
          <Button label="New sale" icon="add" size="sm" onPress={() => router.push('/sale/new')} />
          {!isOwner ? <IconButton icon="person-circle-outline" accessibilityLabel="Account" onPress={() => router.push('/account')} /> : null}
        </>
      }
    />
  );

  if (loading) {
    return (
      <Screen>
        {header}
        <SkeletonStats count={2} />
        <SkeletonList rows={5} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        {header}
        <ErrorState message={error ?? 'Your sales could not be loaded.'} onRetry={retry} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {header}
      {error ? <InlineError message={error} onRetry={reload} /> : null}
      <PendingRecords kind="sale" />
      {data.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No sales recorded yet"
          message="Your sales activity will appear here. Record your first sale to get started."
          actionLabel="Record a sale"
          onAction={() => router.push('/sale/new')}
        />
      ) : (
        <>
          <StatGrid>
            <StatCard label="Today" value={formatNaira(stats.todayTotal)} icon="today-outline" hint={`${stats.todayCount} sale${stats.todayCount === 1 ? '' : 's'}`} />
            <StatCard label="This month" value={formatNaira(stats.monthTotal)} icon="calendar-outline" hint={`${stats.monthCount} sale${stats.monthCount === 1 ? '' : 's'}`} />
          </StatGrid>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search by product, customer or reference" />
          <ChipGroup scrollable options={FILTERS} value={filter} onChange={setFilter} />
          {groups.length === 0 ? (
            <AppText tone="muted" align="center" style={styles.noMatch}>
              No sales match your search.
            </AppText>
          ) : (
            groups.map((g) => (
              <View key={g.key} style={styles.group}>
                <AppText variant="overline" tone="muted">
                  {g.label} · {formatNaira(g.sales.reduce((sum, s) => sum + s.totalAmount, 0))}
                </AppText>
                <Card style={styles.list}>
                  {g.sales.map((s, i) => (
                    <SaleRow key={s.id} sale={s} last={i === g.sales.length - 1} />
                  ))}
                </Card>
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  group: { gap: spacing.sm },
  list: { paddingVertical: spacing.xs, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: spacing.sm + 2 },
  rowPress: { padding: 0, borderWidth: 0, borderRadius: 0, shadowOpacity: 0, elevation: 0, backgroundColor: 'transparent' },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  badges: { flexDirection: 'row', gap: spacing.xs },
  noMatch: { paddingVertical: spacing.lg },
});
