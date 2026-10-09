import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { PageHeader } from '../../src/components/PageHeader';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ChipGroup } from '../../src/components/Chip';
import { SearchBar } from '../../src/components/SearchBar';
import { ListRow } from '../../src/components/ListRow';
import { isLowStock as isLow, isOutOfStock as isOut, StockBadge } from '../../src/components/StockBadge';
import { AppText } from '../../src/components/AppText';
import { ProductImage } from '../../src/components/ProductImage';
import { EmptyState, ErrorState, InlineError, SkeletonList } from '../../src/components/Feedback';
import { listProducts } from '../../src/api/products';
import { useResource } from '../../src/hooks/useResource';
import { pendingStock, useMyOutbox } from '../../src/offline/outbox';
import { prefetchProductImages } from '../../src/offline/image-cache';
import { selectIsOwner, useAuthStore } from '../../src/store/auth-store';
import { formatNaira } from '../../src/utils/currency';
import { spacing } from '../../src/theme';

type Filter = 'all' | 'low' | 'out';

export default function InventoryScreen() {
  const isOwner = useAuthStore(selectIsOwner);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const products = useResource(listProducts, ['product.changed', 'stock.adjusted', 'sale.completed'], [], { key: 'products' });
  const { error, loading, refreshing, reload, retry } = products;
  const outbox = useMyOutbox();

  // Stock on this phone already reflects sales made offline that haven't synced yet.
  const data = useMemo(() => {
    const pending = pendingStock(outbox);
    if (!products.data || pending.size === 0) return products.data;
    return products.data.map((p) => (pending.has(p.id) ? { ...p, stockQty: p.stockQty - pending.get(p.id)! } : p));
  }, [products.data, outbox]);

  // Keep every photo on the phone, so the list shows them at once and offline.
  useEffect(() => {
    if (products.data && products.savedAt === null) prefetchProductImages(products.data);
  }, [products.data, products.savedAt]);

  const counts = useMemo(
    () => ({ low: (data ?? []).filter(isLow).length, out: (data ?? []).filter(isOut).length }),
    [data],
  );
  const stockValue = useMemo(() => (data ?? []).reduce((sum, p) => sum + (p.costPrice ?? 0) * Math.max(0, p.stockQty), 0), [data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (filter === 'low' && !isLow(p)) return false;
      if (filter === 'out' && !isOut(p)) return false;
      return !q || p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q) || (p.barcode ?? '').includes(q);
    });
  }, [data, query, filter]);

  const header = (
    <PageHeader
      title="Inventory"
      subtitle={
        data && data.length > 0
          ? `${data.length} product${data.length === 1 ? '' : 's'}${isOwner ? ` · worth ${formatNaira(stockValue)} at cost` : ''}`
          : 'Your products and stock levels'
      }
      actions={isOwner ? <Button label="Add" icon="add" size="sm" onPress={() => router.push('/product/form')} accessibilityLabel="Add product" /> : null}
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
        <ErrorState message={error ?? 'Your inventory could not be loaded.'} onRetry={retry} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {header}
      {error ? <InlineError message={error} onRetry={reload} /> : null}
      {data.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No products yet"
          message={isOwner ? 'Add your first product to start managing your inventory.' : 'The business owner has not added any products yet.'}
          actionLabel={isOwner ? 'Add product' : undefined}
          onAction={isOwner ? () => router.push('/product/form') : undefined}
        />
      ) : (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name, SKU or barcode" />
          <ChipGroup
            scrollable
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All (${data.length})` },
              { value: 'low', label: `Low stock (${counts.low})` },
              { value: 'out', label: `Out of stock (${counts.out})` },
            ]}
          />
          {visible.length === 0 ? (
            <AppText tone="muted" align="center" style={styles.noMatch}>
              {query ? `No products match “${query}”.` : 'Nothing here right now.'}
            </AppText>
          ) : (
            <Card style={styles.list}>
              {visible.map((p, i) => (
                <ListRow
                  key={p.id}
                  title={p.name}
                  subtitle={[`Sells ${formatNaira(p.sellingPrice)}`, p.sku ? `SKU ${p.sku}` : null].filter(Boolean).join(' · ')}
                  leading={<ProductImage product={p} size={56} />}
                  trailing={<StockBadge product={p} />}
                  onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
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

