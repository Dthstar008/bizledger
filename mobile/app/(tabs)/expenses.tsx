import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { PageHeader } from '../../src/components/PageHeader';
import { Button } from '../../src/components/Button';
import { Card, Section } from '../../src/components/Card';
import { ChipGroup } from '../../src/components/Chip';
import { SearchBar } from '../../src/components/SearchBar';
import { ListRow } from '../../src/components/ListRow';
import { AppText } from '../../src/components/AppText';
import { StatCard, StatGrid } from '../../src/components/StatCard';
import { BarList } from '../../src/components/Charts';
import { EmptyState, ErrorState, InlineError, SkeletonList, SkeletonStats } from '../../src/components/Feedback';
import { listExpenses } from '../../src/api/expenses';
import { Expense, ExpenseCategory } from '../../src/api/types';
import { useResource } from '../../src/hooks/useResource';
import { formatNaira } from '../../src/utils/currency';
import { EXPENSE_CATEGORIES, expenseCategory } from '../../src/utils/expenses';
import { dayHeading, dayKey } from '../../src/utils/format';
import { colors, radius, spacing } from '../../src/theme';

type Filter = 'all' | ExpenseCategory;

const sum = (list: Expense[]) => list.reduce((total, e) => total + e.amount, 0);

export default function ExpensesScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { data, error, loading, refreshing, reload, retry } = useResource(listExpenses, ['expense.changed', 'branch.selected']);

  const stats = useMemo(() => {
    const all = data ?? [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonth = all.filter((e) => new Date(e.createdAt).getTime() >= monthStart);
    const byCategory = EXPENSE_CATEGORIES.map((c) => ({ label: c.label, value: sum(thisMonth.filter((e) => e.category === c.value)) }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
    return { month: sum(thisMonth), monthCount: thisMonth.length, allTime: sum(all), byCategory };
  }, [data]);

  const usedCategories = useMemo(() => EXPENSE_CATEGORIES.filter((c) => (data ?? []).some((e) => e.category === c.value)), [data]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (data ?? []).filter((e) => {
      if (filter !== 'all' && e.category !== filter) return false;
      return !q || (e.description ?? '').toLowerCase().includes(q) || expenseCategory(e.category).label.toLowerCase().includes(q);
    });
    const out: { key: string; heading: string; total: number; items: Expense[] }[] = [];
    for (const e of matches) {
      const key = dayKey(e.createdAt);
      let group = out[out.length - 1];
      if (!group || group.key !== key) {
        group = { key, heading: dayHeading(e.createdAt), total: 0, items: [] };
        out.push(group);
      }
      group.items.push(e);
      group.total += e.amount;
    }
    return out;
  }, [data, query, filter]);

  const addExpense = () => router.push('/expense/form');
  const header = (
    <PageHeader
      title="Expenses"
      subtitle="Money going out of the business"
      actions={<Button label="Add" icon="add" size="sm" onPress={addExpense} accessibilityLabel="Add expense" />}
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
        <ErrorState message={error ?? 'Your expenses could not be loaded.'} onRetry={retry} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {header}
      {error ? <InlineError message={error} onRetry={reload} /> : null}
      {data.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="No expenses yet"
          message="Record rent, transport, salaries and other costs to see your real profit."
          actionLabel="Add expense"
          onAction={addExpense}
        />
      ) : (
        <>
          <StatGrid>
            <StatCard label="This month" value={formatNaira(stats.month)} icon="calendar-outline" hint={`${stats.monthCount} expense${stats.monthCount === 1 ? '' : 's'}`} />
            <StatCard label="All time" value={formatNaira(stats.allTime)} icon="wallet-outline" hint={`${data.length} expense${data.length === 1 ? '' : 's'}`} />
          </StatGrid>

          {stats.byCategory.length > 0 ? (
            <Section title="This month by category">
              <BarList items={stats.byCategory} format={formatNaira} />
            </Section>
          ) : null}

          <SearchBar value={query} onChangeText={setQuery} placeholder="Search notes or categories" />
          {usedCategories.length > 1 ? (
            <ChipGroup
              scrollable
              value={filter}
              onChange={setFilter}
              options={[{ value: 'all' as Filter, label: 'All' }, ...usedCategories.map((c) => ({ value: c.value as Filter, label: c.label, icon: c.icon }))]}
            />
          ) : null}

          {groups.length === 0 ? (
            <AppText tone="muted" align="center" style={styles.noMatch}>
              {query ? `No expenses match “${query}”.` : 'No expenses in this category.'}
            </AppText>
          ) : (
            groups.map((g) => (
              <View key={g.key} style={styles.group}>
                <View style={styles.groupHead}>
                  <AppText variant="overline" tone="muted">
                    {g.heading}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {formatNaira(g.total)}
                  </AppText>
                </View>
                <Card style={styles.list}>
                  {g.items.map((e, i) => {
                    const cat = expenseCategory(e.category);
                    return (
                      <ListRow
                        key={e.id}
                        title={e.description || cat.label}
                        subtitle={`${cat.label} · ${new Date(e.createdAt).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}`}
                        leading={
                          <View style={styles.icon}>
                            <Ionicons name={cat.icon} size={20} color={colors.primary} />
                          </View>
                        }
                        trailing={<AppText variant="bodyStrong">{formatNaira(e.amount)}</AppText>}
                        onPress={() => router.push({ pathname: '/expense/form', params: { id: e.id } })}
                        last={i === g.items.length - 1}
                      />
                    );
                  })}
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
  list: { paddingVertical: spacing.xs, gap: 0 },
  noMatch: { paddingVertical: spacing.lg },
  group: { gap: spacing.sm },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xs },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
});
