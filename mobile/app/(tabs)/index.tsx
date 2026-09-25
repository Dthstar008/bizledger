import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { StatCard } from '../../src/components/StatCard';
import { Button } from '../../src/components/Button';
import { getDashboardSummary } from '../../src/api/dashboard';
import { apiErrorMessage } from '../../src/api/client';
import { DashboardSummary } from '../../src/api/types';
import { formatNaira } from '../../src/utils/currency';
import { useAuthStore } from '../../src/store/auth-store';
import { colors, radius, spacing } from '../../src/theme';
import { useFocusLoad } from '../../src/hooks/useFocusLoad';

export default function DashboardScreen() {
  const business = useAuthStore((s) => s.business);
  const logout = useAuthStore((s) => s.logout);
  const branches = useAuthStore((s) => s.branches);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const setActiveBranch = useAuthStore((s) => s.setActiveBranch);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // Re-run when the owner switches branch: the API filters by the X-Branch-Id header.
  }, [activeBranchId]);

  useFocusLoad(load);

  return (
    <ScreenContainer refreshing={loading} onRefresh={load}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{business?.name ?? 'Your business'}</Text>
          <Text style={styles.subtitle}>
            This month · {branches.find((b) => b.id === activeBranchId)?.name ?? 'All branches'}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            logout();
            router.replace('/login');
          }}
        >
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.actionButton}>
          <Button label="Analytics" variant="secondary" onPress={() => router.push('/analytics')} />
        </View>
        <View style={styles.actionButton}>
          <Button label="Team & branches" variant="secondary" onPress={() => router.push('/team')} />
        </View>
      </View>

      {branches.length > 1 && (
        <View style={styles.chipRow}>
          {[{ id: null, name: 'All branches' }, ...branches].map((b) => (
            <Pressable
              key={b.id ?? 'all'}
              onPress={() => setActiveBranch(b.id)}
              style={[styles.chip, activeBranchId === b.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, activeBranchId === b.id && styles.chipTextActive]}>{b.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {summary ? (
        <>
          <View style={styles.grid}>
            <StatCard label="Revenue" value={formatNaira(summary.revenue)} />
            <StatCard label="Gross profit" value={formatNaira(summary.grossProfit)} tone="positive" />
            <StatCard label="Expenses" value={formatNaira(summary.expenses)} tone="negative" />
            <StatCard
              label="Net profit"
              value={formatNaira(summary.netProfit)}
              tone={summary.netProfit >= 0 ? 'positive' : 'negative'}
            />
            <StatCard label="Cash" value={formatNaira(summary.cash)} />
            <StatCard label="Inventory value" value={formatNaira(summary.inventoryValue)} />
            <StatCard label="Customer debt" value={formatNaira(summary.outstandingCustomerDebt)} tone="negative" />
            <StatCard label="Sales this month" value={String(summary.saleCount)} />
          </View>

          {summary.insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Things you should know</Text>
              {summary.insights.map((insight, i) => (
                <View key={i} style={styles.insightRow}>
                  <Text style={styles.insightBullet}>•</Text>
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
          )}

          {summary.lowStockProducts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Low stock</Text>
              {summary.lowStockProducts.map((p) => (
                <View key={p.id} style={styles.rowBetween}>
                  <Text style={styles.rowLabel}>{p.name}</Text>
                  <Text style={styles.rowValue}>{p.stockQty} left</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        !loading && !error && <Text style={styles.subtitle}>No data yet — record your first sale.</Text>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  logout: {
    color: colors.danger,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  insightRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  insightBullet: {
    color: colors.primary,
  },
  insightText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: colors.text,
  },
  rowValue: {
    color: colors.warning,
    fontWeight: '600',
  },
});
