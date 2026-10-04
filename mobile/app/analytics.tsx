import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { ChipGroup } from '../src/components/Chip';
import { BranchSwitcher, useActiveBranchName } from '../src/components/BranchSwitcher';
import { Section } from '../src/components/Card';
import { StatCard, StatGrid } from '../src/components/StatCard';
import { AppText } from '../src/components/AppText';
import { ListRow } from '../src/components/ListRow';
import { ProductImage } from '../src/components/ProductImage';
import { Badge } from '../src/components/Badge';
import { BarList, TrendChart } from '../src/components/Charts';
import { ErrorState, InlineError, Skeleton, SkeletonStats } from '../src/components/Feedback';
import { getAnalytics } from '../src/api/analytics';
import { Analytics, Granularity, PaymentMethod } from '../src/api/types';
import { useResource } from '../src/hooks/useResource';
import { formatNaira } from '../src/utils/currency';
import { capitalise } from '../src/utils/format';
import { spacing } from '../src/theme';

type Period = '7d' | '30d' | '90d' | '12m';

const PERIODS: { value: Period; label: string; days: number; granularity: Granularity; unit: string }[] = [
  { value: '7d', label: '7 days', days: 7, granularity: 'day', unit: 'Daily' },
  { value: '30d', label: '30 days', days: 30, granularity: 'day', unit: 'Daily' },
  { value: '90d', label: '3 months', days: 90, granularity: 'week', unit: 'Weekly' },
  { value: '12m', label: '12 months', days: 365, granularity: 'month', unit: 'Monthly' },
];

const METHOD: Record<PaymentMethod, string> = { cash: 'Cash', transfer: 'Transfer', pos: 'POS', credit: 'Credit' };

function bucketLabel(bucket: string, g: Granularity): string {
  const d = new Date(bucket);
  if (g === 'month') return d.toLocaleDateString('en-NG', { month: 'short' });
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="metric">{value}</AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('30d');
  const branchName = useActiveBranchName();
  const p = PERIODS.find((x) => x.value === period)!;
  const { data, error, loading, refreshing, reload, retry } = useResource<Analytics>(
    () => {
      const to = new Date();
      const from = new Date(to.getTime() - (p.days - 1) * 86400000);
      from.setHours(0, 0, 0, 0);
      return getAnalytics({ from, to, granularity: p.granularity });
    },
    ['sale.completed', 'payment.received', 'expense.changed', 'stock.adjusted', 'branch.selected'],
    [period],
  );

  const controls = (
    <>
      <AppText variant="caption" tone="muted">
        {branchName}
      </AppText>
      <ChipGroup scrollable options={PERIODS.map(({ value, label }) => ({ value, label }))} value={period} onChange={setPeriod} />
      <BranchSwitcher />
    </>
  );

  if (loading || (!data && !error)) {
    return (
      <Screen edges={[]}>
        {controls}
        <SkeletonStats count={6} />
        <Skeleton height={200} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen edges={[]}>
        {controls}
        <ErrorState message={error ?? 'Analytics could not be loaded.'} onRetry={retry} />
      </Screen>
    );
  }

  const a = data;
  const noSales = a.totals.saleCount === 0;
  const trend = a.series.map((s) => ({ label: bucketLabel(s.bucket, a.granularity), value: s.revenue, secondary: s.expenses }));

  return (
    <Screen edges={[]} refreshing={refreshing} onRefresh={reload}>
      {controls}
      {error ? <InlineError message={error} onRetry={reload} /> : null}

      <StatGrid>
        <StatCard label="Revenue" value={formatNaira(a.totals.revenue)} icon="trending-up-outline" />
        <StatCard label="Gross profit" value={formatNaira(a.totals.profit)} tone="positive" icon="stats-chart-outline" />
        <StatCard label="Expenses" value={formatNaira(a.expenses.total)} tone="negative" icon="wallet-outline" />
        <StatCard label="Net profit" value={formatNaira(a.netProfit)} tone={a.netProfit >= 0 ? 'positive' : 'negative'} icon="ribbon-outline" />
        <StatCard label="Sales" value={String(a.totals.saleCount)} icon="receipt-outline" />
        <StatCard label="Average sale" value={formatNaira(a.totals.averageSale)} icon="calculator-outline" />
      </StatGrid>

      <Section title="Sales overview" description={`${p.unit} revenue, with expenses as a line`}>
        {noSales && a.expenses.total === 0 ? (
          <AppText tone="muted">No sales or expenses in this period.</AppText>
        ) : (
          <TrendChart data={trend} primaryLabel="Revenue" secondaryLabel="Expenses" />
        )}
      </Section>

      <Section title="Expense overview" description={`${formatNaira(a.expenses.total)} spent in this period`}>
        {a.expenses.byCategory.length === 0 ? (
          <AppText tone="muted">No expenses recorded in this period.</AppText>
        ) : (
          <BarList items={a.expenses.byCategory.map((c) => ({ label: capitalise(c.category), value: c.amount }))} format={formatNaira} />
        )}
      </Section>

      <Section title="Best sellers">
        {a.topProducts.length === 0 ? (
          <AppText tone="muted">Nothing sold in this period yet.</AppText>
        ) : (
          a.topProducts.map((t, i, arr) => (
            <ListRow
              key={t.productId}
              title={t.name}
              subtitle={`${t.units} sold · profit ${formatNaira(t.profit)}`}
              leading={<ProductImage product={{ id: t.productId, name: t.name, imageUpdatedAt: t.imageUpdatedAt }} size={40} />}
              trailing={<AppText variant="bodyStrong">{formatNaira(t.revenue)}</AppText>}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: t.productId } })}
              last={i === arr.length - 1}
            />
          ))
        )}
      </Section>

      <Section title="Slow movers" description="Products that sold least in this period">
        {a.slowProducts.length === 0 ? (
          <AppText tone="muted">Add products to see how they move.</AppText>
        ) : (
          a.slowProducts.map((s, i, arr) => (
            <ListRow
              key={s.productId}
              title={s.name}
              subtitle={`${s.stock} in stock`}
              leading={<ProductImage product={{ id: s.productId, name: s.name, imageUpdatedAt: s.imageUpdatedAt }} size={40} />}
              trailing={<Badge label={s.units === 0 ? 'No sales' : `${s.units} sold`} tone={s.units === 0 ? 'warning' : 'neutral'} />}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: s.productId } })}
              last={i === arr.length - 1}
            />
          ))
        )}
      </Section>

      <Section title="Inventory movement" description="From your stock history">
        <View style={styles.metrics}>
          <Metric label="Units sold" value={String(a.inventoryMovement.unitsSold)} />
          <Metric label="Units added" value={String(a.inventoryMovement.unitsAdded)} />
          <Metric label="Units removed" value={String(a.inventoryMovement.unitsRemoved)} />
        </View>
      </Section>

      <Section title="Customer insights">
        <View style={styles.metrics}>
          <Metric label="Buying customers" value={String(a.customers.active)} />
          <Metric label="New" value={String(a.customers.new)} />
          <Metric label="Returning" value={String(a.customers.returning)} />
        </View>
        {a.customers.total > 0 ? (
          <AppText variant="caption" tone="muted">
            {a.customers.total} customer{a.customers.total === 1 ? '' : 's'} on record. Sales without a named customer aren't counted here.
          </AppText>
        ) : null}
        {a.topCustomers.length > 0 ? (
          <View>
            <AppText variant="label" tone="muted" style={styles.subhead}>
              Best customers
            </AppText>
            {a.topCustomers.map((c, i, arr) => (
              <ListRow
                key={c.customerId}
                title={c.name}
                subtitle={`${c.saleCount} purchase${c.saleCount === 1 ? '' : 's'}`}
                trailing={<AppText variant="bodyStrong">{formatNaira(c.revenue)}</AppText>}
                onPress={() => router.push({ pathname: '/customer/[id]', params: { id: c.customerId } })}
                last={i === arr.length - 1}
              />
            ))}
          </View>
        ) : null}
      </Section>

      <Section title="How customers pay">
        {a.paymentMix.length === 0 ? (
          <AppText tone="muted">No payments in this period.</AppText>
        ) : (
          <BarList items={a.paymentMix.map((m) => ({ label: METHOD[m.method] ?? m.method, value: m.revenue }))} format={formatNaira} />
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: spacing.md },
  metric: { flex: 1, gap: 2 },
  subhead: { marginTop: spacing.sm, marginBottom: spacing.xs },
});
