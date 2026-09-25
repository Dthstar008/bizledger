import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { StatCard } from '../src/components/StatCard';
import { getAnalytics } from '../src/api/analytics';
import { apiErrorMessage } from '../src/api/client';
import { Analytics, PaymentMethod } from '../src/api/types';
import { formatNaira } from '../src/utils/currency';
import { useAuthStore } from '../src/store/auth-store';
import { colors, radius, spacing } from '../src/theme';
import { useFocusLoad } from '../src/hooks/useFocusLoad';

type Period = '7d' | '30d' | 'month';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
];

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  transfer: 'Transfer',
  pos: 'POS',
  credit: 'Credit',
};

function rangeFor(period: Period): { from: Date; to: Date } {
  const to = new Date();
  if (period === 'month') return { from: new Date(to.getFullYear(), to.getMonth(), 1), to };
  const days = period === '7d' ? 7 : 30;
  const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function shortDay(day: string) {
  const [, m, d] = day.split('-');
  return `${parseInt(d, 10)}/${parseInt(m, 10)}`;
}

export default function AnalyticsScreen() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const branches = useAuthStore((s) => s.branches);
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalytics(rangeFor(period)));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // Reload on period or branch change (branch travels in the X-Branch-Id header).
  }, [period, activeBranchId]);

  useFocusLoad(load);

  const maxRevenue = data ? Math.max(1, ...data.daily.map((d) => d.revenue)) : 1;
  const totalMix = data ? Math.max(1, data.paymentMix.reduce((sum, m) => sum + m.revenue, 0)) : 1;
  const branchLabel = branches.find((b) => b.id === activeBranchId)?.name ?? 'All branches';

  return (
    <ScreenContainer refreshing={loading} onRefresh={load}>
      <Text style={styles.subtitle}>{branchLabel}</Text>
      <View style={styles.chipRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[styles.chip, period === p.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, period === p.key && styles.chipTextActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {data ? (
        <>
          <View style={styles.grid}>
            <StatCard label="Revenue" value={formatNaira(data.totals.revenue)} />
            <StatCard label="Gross profit" value={formatNaira(data.totals.profit)} tone="positive" />
            <StatCard label="Sales" value={String(data.totals.saleCount)} />
            <StatCard label="Average sale" value={formatNaira(data.totals.averageSale)} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily sales</Text>
            {data.totals.saleCount === 0 ? (
              <Text style={styles.muted}>No sales in this period.</Text>
            ) : (
              <>
                <View style={styles.chart}>
                  {data.daily.map((d) => (
                    <View key={d.day} style={styles.barSlot}>
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max(d.revenue > 0 ? 3 : 0, (d.revenue / maxRevenue) * 110) },
                        ]}
                      />
                    </View>
                  ))}
                </View>
                <View style={styles.axis}>
                  <Text style={styles.muted}>{shortDay(data.daily[0].day)}</Text>
                  <Text style={styles.muted}>Peak {formatNaira(maxRevenue)}</Text>
                  <Text style={styles.muted}>{shortDay(data.daily[data.daily.length - 1].day)}</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top products</Text>
            {data.topProducts.length === 0 && <Text style={styles.muted}>Nothing sold yet.</Text>}
            {data.topProducts.map((p, i) => (
              <View key={`${p.productId}-${i}`} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p.name}</Text>
                  <Text style={styles.muted}>{p.units} sold · profit {formatNaira(p.profit)}</Text>
                </View>
                <Text style={styles.rowValue}>{formatNaira(p.revenue)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Best customers</Text>
            {data.topCustomers.length === 0 && <Text style={styles.muted}>No sales linked to a customer yet.</Text>}
            {data.topCustomers.map((c) => (
              <View key={c.customerId} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{c.name}</Text>
                  <Text style={styles.muted}>{c.saleCount} purchases</Text>
                </View>
                <Text style={styles.rowValue}>{formatNaira(c.revenue)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How customers pay</Text>
            {data.paymentMix.map((m) => (
              <View key={m.method} style={{ gap: 4 }}>
                <View style={styles.row}>
                  <Text style={[styles.rowTitle, { flex: 1 }]}>{METHOD_LABEL[m.method] ?? m.method}</Text>
                  <Text style={styles.rowValue}>{formatNaira(m.revenue)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round((m.revenue / totalMix) * 100)}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        !loading && !error && <Text style={styles.muted}>No data yet.</Text>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: colors.textMuted, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  errorText: { color: colors.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  chart: { height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { backgroundColor: colors.primary, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { color: colors.text, fontWeight: '600' },
  rowValue: { color: colors.text, fontWeight: '700' },
  track: { height: 6, backgroundColor: colors.primaryMuted, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.primary },
});
