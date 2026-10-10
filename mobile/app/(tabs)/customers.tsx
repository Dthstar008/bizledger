import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { PageHeader } from '../../src/components/PageHeader';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ChipGroup } from '../../src/components/Chip';
import { SearchBar } from '../../src/components/SearchBar';
import { ListRow } from '../../src/components/ListRow';
import { Badge } from '../../src/components/Badge';
import { AppText } from '../../src/components/AppText';
import { Avatar, EmptyState, ErrorState, InlineError, SkeletonList } from '../../src/components/Feedback';
import { listCustomers } from '../../src/api/customers';
import { useResource } from '../../src/hooks/useResource';
import { formatNaira } from '../../src/utils/currency';
import { spacing } from '../../src/theme';

type Filter = 'all' | 'owing';

export default function CustomersScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { data, error, loading, refreshing, reload, retry } = useResource(listCustomers, ['customer.changed', 'sale.completed', 'payment.received'], [], { key: 'customers' });

  const owing = useMemo(() => (data ?? []).filter((c) => c.outstandingBalance > 0), [data]);
  const totalOwed = useMemo(() => owing.reduce((sum, c) => sum + c.outstandingBalance, 0), [owing]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\s/g, '');
    const base = filter === 'owing' ? [...owing].sort((a, b) => b.outstandingBalance - a.outstandingBalance) : data ?? [];
    return base.filter((c) => !q || c.name.toLowerCase().includes(q) || (!!qDigits && (c.phone ?? '').replace(/\s/g, '').includes(qDigits)));
  }, [data, owing, query, filter]);

  const addCustomer = () => router.push('/customer/form');
  const header = (
    <PageHeader
      title="Customers"
      subtitle={
        data && data.length > 0
          ? `${data.length} customer${data.length === 1 ? '' : 's'}${totalOwed > 0 ? ` · ${formatNaira(totalOwed)} owed to you` : ''}`
          : 'People who buy from you'
      }
      actions={<Button label="Add" icon="person-add-outline" size="sm" onPress={addCustomer} accessibilityLabel="Add customer" />}
    />
  );

  if (loading) {
    return (
      <Screen>
        {header}
        <SkeletonList rows={6} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        {header}
        <ErrorState message={error ?? 'Your customers could not be loaded.'} onRetry={retry} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {header}
      {error ? <InlineError message={error} onRetry={reload} /> : null}
      {data.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No customers yet"
          message="Add the people who buy from you to sell on credit and keep track of what they owe."
          actionLabel="Add customer"
          onAction={addCustomer}
        />
      ) : (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name or phone" />
          <ChipGroup
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All (${data.length})` },
              { value: 'owing', label: `Owing (${owing.length})` },
            ]}
          />
          {visible.length === 0 ? (
            <AppText tone="muted" align="center" style={styles.noMatch}>
              {query ? `No customers match “${query}”.` : 'Nobody owes you money right now.'}
            </AppText>
          ) : (
            <Card style={styles.list}>
              {visible.map((c, i) => (
                <ListRow
                  key={c.id}
                  title={c.name}
                  subtitle={c.phone || 'No phone number'}
                  leading={<Avatar name={c.name} />}
                  trailing={c.outstandingBalance > 0 ? <Badge label={`Owes ${formatNaira(c.outstandingBalance)}`} tone="danger" /> : null}
                  onPress={() => router.push({ pathname: '/customer/[id]', params: { id: c.id } })}
                  last={i === visible.length - 1}
                />
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.xs, gap: 0 },
  noMatch: { paddingVertical: spacing.lg },
});
