import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipGroup } from '../src/components/Chip';
import { AppText } from '../src/components/AppText';
import { ActivityItem } from '../src/components/ActivityItem';
import { EmptyState, ErrorState, SkeletonList } from '../src/components/Feedback';
import { Button } from '../src/components/Button';
import { listLedgerEvents } from '../src/api/ledger';
import { apiErrorMessage } from '../src/api/client';
import { LedgerEvent, LedgerEventType } from '../src/api/types';
import { useEvent } from '../src/events/bus';
import { useTeamNames } from '../src/hooks/useTeamNames';
import { dayHeading, dayKey } from '../src/utils/format';
import { colors, layout, radius, spacing } from '../src/theme';

type Filter = 'all' | 'sales' | 'stock' | 'customers' | 'expenses' | 'products';

const FILTERS: { value: Filter; label: string; types?: LedgerEventType[] }[] = [
  { value: 'all', label: 'All' },
  { value: 'sales', label: 'Sales & payments', types: ['SALE_CREATED', 'PAYMENT_RECEIVED', 'CUSTOMER_CREDIT_CREATED', 'CUSTOMER_CREDIT_REPAID'] },
  { value: 'stock', label: 'Stock', types: ['INVENTORY_DECREASED', 'INVENTORY_ADJUSTED'] },
  { value: 'products', label: 'Products', types: ['PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED'] },
  { value: 'customers', label: 'Customers', types: ['CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CUSTOMER_DELETED'] },
  { value: 'expenses', label: 'Expenses', types: ['EXPENSE_CREATED', 'EXPENSE_UPDATED', 'EXPENSE_DELETED'] },
];

const PAGE = 40;

type Row = { kind: 'day'; key: string; label: string } | { kind: 'event'; key: string; event: LedgerEvent; first: boolean; last: boolean };

function toRows(events: LedgerEvent[]): Row[] {
  const rows: Row[] = [];
  events.forEach((e, i) => {
    const k = dayKey(e.createdAt);
    const first = i === 0 || dayKey(events[i - 1].createdAt) !== k;
    if (first) rows.push({ kind: 'day', key: `d${k}`, label: dayHeading(e.createdAt) });
    const next = events[i + 1];
    rows.push({ kind: 'event', key: e.id, event: e, first, last: !next || dayKey(next.createdAt) !== k });
  });
  return rows;
}

/** The full business ledger: every recorded event, newest first, paged by cursor. */
export default function ActivityScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actorName = useTeamNames();
  const seq = useRef(0);
  const types = FILTERS.find((f) => f.value === filter)?.types;

  const loadFirst = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const page = await listLedgerEvents({ types, limit: PAGE });
      if (id !== seq.current) return;
      setEvents(page);
      setDone(page.length < PAGE);
    } catch (err) {
      if (id === seq.current) setError(apiErrorMessage(err));
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadMore = async () => {
    if (loadingMore || done || events.length === 0) return;
    setLoadingMore(true);
    try {
      const page = await listLedgerEvents({ types, limit: PAGE, before: events[events.length - 1].createdAt });
      setEvents((prev) => [...prev, ...page]);
      setDone(page.length < PAGE);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);
  // New events arrive as the business works; pull them in.
  useEvent(['sale.completed', 'payment.received', 'stock.adjusted', 'product.changed', 'customer.changed', 'expense.changed'], () => void loadFirst());

  const header = (
    <View style={styles.header}>
      <AppText tone="muted">Every sale, payment and change, recorded as it happened.</AppText>
      <ChipGroup scrollable options={FILTERS.map(({ value, label }) => ({ value, label }))} value={filter} onChange={setFilter} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <View style={styles.pad}>
          {header}
          <SkeletonList rows={6} />
        </View>
      ) : error && events.length === 0 ? (
        <View style={styles.pad}>
          {header}
          <ErrorState message={error} onRetry={loadFirst} />
        </View>
      ) : (
        <FlatList
          data={toRows(events)}
          keyExtractor={(r) => r.key}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          onRefresh={loadFirst}
          refreshing={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="time-outline" title="Nothing here yet" message="Activity will appear here as you record sales, stock and expenses." />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={styles.more} />
            ) : !done && events.length > 0 ? (
              <Button label="Load more" variant="ghost" onPress={loadMore} style={styles.moreButton} />
            ) : null
          }
          renderItem={({ item }) =>
            item.kind === 'day' ? (
              <AppText variant="overline" tone="muted" style={styles.day}>
                {item.label}
              </AppText>
            ) : (
              <View style={[styles.cardRow, item.first && styles.cardFirst, item.last && styles.cardLast]}>
                <ActivityItem event={item.event} actorName={actorName} last={item.last} />
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  pad: { padding: spacing.md, gap: spacing.md, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.xl, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  day: { marginTop: spacing.md, marginBottom: spacing.sm },
  // Consecutive event rows form one card per day.
  cardRow: { backgroundColor: colors.surface, paddingHorizontal: spacing.md, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  cardFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  cardLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, marginBottom: spacing.xs },
  more: { marginVertical: spacing.md },
  moreButton: { alignSelf: 'center', marginTop: spacing.sm },
});
