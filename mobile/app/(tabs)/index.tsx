import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { PageHeader } from '../../src/components/PageHeader';
import { IconButton } from '../../src/components/IconButton';
import { BranchSwitcher, useActiveBranchName } from '../../src/components/BranchSwitcher';
import { Button } from '../../src/components/Button';
import { Card, Section } from '../../src/components/Card';
import { StatCard, StatGrid } from '../../src/components/StatCard';
import { AppText } from '../../src/components/AppText';
import { ListRow } from '../../src/components/ListRow';
import { ActivityItem } from '../../src/components/ActivityItem';
import { TrendChart } from '../../src/components/Charts';
import { ErrorState, InlineError, Skeleton, SkeletonList, SkeletonStats } from '../../src/components/Feedback';
import { ProductImage } from '../../src/components/ProductImage';
import { getDashboardSummary } from '../../src/api/dashboard';
import { getAnalytics } from '../../src/api/analytics';
import { listLedgerEvents } from '../../src/api/ledger';
import { useResource } from '../../src/hooks/useResource';
import { useTeamNames } from '../../src/hooks/useTeamNames';
import { useAuthStore } from '../../src/store/auth-store';
import { formatNaira } from '../../src/utils/currency';
import { firstName, greetingFor } from '../../src/utils/format';
import { colors, radius, spacing } from '../../src/theme';

const DASHBOARD_EVENTS = [
  'sale.completed',
  'payment.received',
  'stock.adjusted',
  'product.changed',
  'customer.changed',
  'expense.changed',
  'branch.selected',
] as const;

async function loadDashboard() {
  const to = new Date();
  const from = new Date(to.getTime() - 6 * 86400000);
  from.setHours(0, 0, 0, 0);
  const [summary, week, activity] = await Promise.all([
    getDashboardSummary(),
    getAnalytics({ from, to, granularity: 'day' }),
    listLedgerEvents({ limit: 6 }),
  ]);
  return { summary, week, activity };
}

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const business = useAuthStore((s) => s.business);
  const branchName = useActiveBranchName();
  const actorName = useTeamNames();
  const { data, error, loading, refreshing, reload, retry } = useResource(loadDashboard, [...DASHBOARD_EVENTS]);

  const name = firstName(user?.name) ?? business?.name ?? 'there';
  const header = (
    <PageHeader
      title={`${greetingFor()}, ${name}`}
      subtitle={`${business?.name ?? 'Your business'} this month · ${branchName}`}
      actions={
        <>
          <IconButton icon="people-outline" accessibilityLabel="Team and branches" onPress={() => router.push('/team')} />
          <IconButton icon="person-circle-outline" accessibilityLabel="Account" onPress={() => router.push('/account')} />
        </>
      }
    />
  );

  if (loading) {
    return (
      <Screen>
        {header}
        <SkeletonStats count={6} />
        <Card>
          <Skeleton height={160} />
        </Card>
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        {header}
        <ErrorState message={error ?? 'Your dashboard could not be loaded.'} onRetry={retry} />
      </Screen>
    );
  }

  const { summary, week, activity } = data;
  const trend = week.daily.map((d) => ({
    label: new Date(d.day).toLocaleDateString('en-NG', { weekday: 'short' }),
    value: d.revenue,
    secondary: week.series.find((s) => s.bucket === d.day)?.expenses ?? 0,
  }));

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {header}
      <BranchSwitcher />
      {error ? <InlineError message={error} onRetry={reload} /> : null}

      <View style={styles.actions}>
        <Button label="New sale" icon="add" onPress={() => router.push('/sale/new')} fullWidth />
        <View style={styles.actionRow}>
          <Button label="Add product" icon="cube-outline" variant="secondary" size="sm" onPress={() => router.push('/product/form')} style={styles.flexButton} />
          <Button label="Add expense" icon="wallet-outline" variant="secondary" size="sm" onPress={() => router.push('/expense/form')} style={styles.flexButton} />
        </View>
      </View>

      <StatGrid>
        <StatCard label="Revenue" value={formatNaira(summary.revenue)} icon="trending-up-outline" hint={`${summary.saleCount} sale${summary.saleCount === 1 ? '' : 's'}`} />
        <StatCard
          label="Net profit"
          value={formatNaira(summary.netProfit)}
          icon="stats-chart-outline"
          tone={summary.netProfit >= 0 ? 'positive' : 'negative'}
          hint={`Gross ${formatNaira(summary.grossProfit)}`}
        />
        <StatCard label="Expenses" value={formatNaira(summary.expenses)} icon="wallet-outline" tone={summary.expenses > 0 ? 'negative' : 'default'} onPress={() => router.push('/(tabs)/expenses')} />
        <StatCard label="Cash in hand" value={formatNaira(summary.cash)} icon="cash-outline" hint="After expenses" />
        <StatCard label="Inventory value" value={formatNaira(summary.inventoryValue)} icon="cube-outline" onPress={() => router.push('/(tabs)/inventory')} />
        <StatCard label="Customers" value={String(summary.customerCount)} icon="people-outline" onPress={() => router.push('/(tabs)/customers')} />
      </StatGrid>

      {summary.outstandingCustomerDebt > 0 ? (
        <Card onPress={() => router.push('/(tabs)/customers')} style={styles.debt} accessibilityLabel={`Customers owe you ${formatNaira(summary.outstandingCustomerDebt)}`}>
          <View style={styles.debtRow}>
            <View style={styles.debtIcon}>
              <Ionicons name="time-outline" size={20} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" tone="muted">
                Customers owe you
              </AppText>
              <AppText variant="metric" tone="warning">
                {formatNaira(summary.outstandingCustomerDebt)}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </View>
        </Card>
      ) : null}

      <Section
        title="Last 7 days"
        description="Daily revenue and expenses"
        action={<Button label="Analytics" size="sm" variant="ghost" icon="arrow-forward" onPress={() => router.push('/analytics')} />}
      >
        {week.totals.saleCount === 0 && week.expenses.total === 0 ? (
          <AppText tone="muted">No sales or expenses in the last 7 days yet.</AppText>
        ) : (
          <TrendChart data={trend} height={170} primaryLabel="Revenue" secondaryLabel="Expenses" />
        )}
        {week.topProducts.length > 0 ? (
          <View>
            <AppText variant="label" tone="muted" style={styles.subhead}>
              Top products this week
            </AppText>
            {week.topProducts.slice(0, 3).map((p, i, arr) => (
              <ListRow
                key={p.productId}
                title={p.name}
                subtitle={`${p.units} sold`}
                leading={<ProductImage product={{ id: p.productId, name: p.name, imageUpdatedAt: p.imageUpdatedAt }} size={36} />}
                trailing={<AppText variant="bodyStrong">{formatNaira(p.revenue)}</AppText>}
                last={i === arr.length - 1}
              />
            ))}
          </View>
        ) : null}
      </Section>

      {summary.insights.length > 0 ? (
        <Section title="Things you should know">
          {summary.insights.map((insight, i) => (
            <View key={i} style={styles.insight}>
              <Ionicons name="bulb-outline" size={18} color={colors.primary} />
              <AppText style={{ flex: 1 }}>{insight}</AppText>
            </View>
          ))}
        </Section>
      ) : null}

      {summary.lowStockProducts.length > 0 ? (
        <Section title="Running low" description="At or below their alert level">
          {summary.lowStockProducts.map((p, i, arr) => (
            <ListRow
              key={p.id}
              title={p.name}
              leading={<ProductImage product={p} size={36} />}
              trailing={
                <AppText variant="bodyStrong" tone={p.stockQty === 0 ? 'danger' : 'warning'}>
                  {p.stockQty === 0 ? 'Out of stock' : `${p.stockQty} left`}
                </AppText>
              }
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
              last={i === arr.length - 1}
            />
          ))}
        </Section>
      ) : null}

      <Section
        title="Recent activity"
        action={<Button label="See all" size="sm" variant="ghost" onPress={() => router.push('/activity')} />}
      >
        {activity.length === 0 ? (
          <AppText tone="muted">Your sales, payments and stock changes will appear here as they happen.</AppText>
        ) : (
          activity.map((e, i) => <ActivityItem key={e.id} event={e} actorName={actorName} last={i === activity.length - 1} />)
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  flexButton: { flex: 1, alignSelf: 'auto' },
  debt: { backgroundColor: colors.warningMuted, borderColor: colors.warningMuted },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  debtIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  subhead: { marginTop: spacing.xs, marginBottom: spacing.xs },
  insight: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});
