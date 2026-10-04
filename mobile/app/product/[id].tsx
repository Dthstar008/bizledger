import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Card, Section } from '../../src/components/Card';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { ChipGroup } from '../../src/components/Chip';
import { TextField } from '../../src/components/TextField';
import { ProductImage } from '../../src/components/ProductImage';
import { StockBadge } from '../../src/components/StockBadge';
import { StatCard, StatGrid } from '../../src/components/StatCard';
import { ActivityItem } from '../../src/components/ActivityItem';
import { ErrorState, InlineError, Skeleton, SkeletonList, confirm } from '../../src/components/Feedback';
import { deleteProduct, getProduct, updateProduct } from '../../src/api/products';
import { listLedgerEvents } from '../../src/api/ledger';
import { apiErrorMessage } from '../../src/api/client';
import { publish } from '../../src/events/bus';
import { goBack } from '../../src/utils/navigation';
import { useResource } from '../../src/hooks/useResource';
import { useTeamNames } from '../../src/hooks/useTeamNames';
import { selectIsOwner, useAuthStore } from '../../src/store/auth-store';
import { formatNaira } from '../../src/utils/currency';
import { parseWholeNumber } from '../../src/utils/validate';
import { spacing } from '../../src/theme';

const REASONS = [
  { value: 'Restock', label: 'Restock' },
  { value: 'Damaged or lost', label: 'Damaged or lost' },
  { value: 'Stock count correction', label: 'Count correction' },
  { value: 'Returned by customer', label: 'Customer return' },
];

function StockAdjuster({ productId, current, onDone }: { productId: string; current: number; onDone: () => void }) {
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Restock');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qty = parseWholeNumber(amount);
  const delta = qty === null ? 0 : direction === 'add' ? qty : -qty;
  const next = current + delta;
  const invalid = qty === null || qty <= 0 ? 'Enter how many units' : next < 0 ? `Only ${current} in stock` : null;

  async function save() {
    if (invalid) return;
    setSaving(true);
    setError(null);
    try {
      await updateProduct(productId, { stockQty: next, stockAdjustmentReason: reason });
      publish({ type: 'stock.adjusted', productId, delta });
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.adjuster}>
      {error ? <InlineError message={error} /> : null}
      <ChipGroup
        options={[
          { value: 'add', label: 'Add stock', icon: 'add-circle-outline' },
          { value: 'remove', label: 'Remove stock', icon: 'remove-circle-outline' },
        ]}
        value={direction}
        onChange={(v) => {
          setDirection(v);
          setReason(v === 'add' ? 'Restock' : 'Damaged or lost');
        }}
      />
      <TextField
        label="How many units?"
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        placeholder="0"
        error={amount && invalid ? invalid : undefined}
        helper={!invalid ? `New stock: ${next}` : undefined}
      />
      <AppText variant="label" tone="muted">
        Reason
      </AppText>
      <ChipGroup options={REASONS} value={reason} onChange={setReason} />
      <View style={styles.row}>
        <Button label="Cancel" variant="secondary" onPress={onDone} style={styles.flexButton} />
        <Button label="Save" icon="checkmark" onPress={save} loading={saving} disabled={!!invalid} style={styles.flexButton} />
      </View>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isOwner = useAuthStore(selectIsOwner);
  const actorName = useTeamNames();
  const [adjusting, setAdjusting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = useResource(() => getProduct(id), ['product.changed', 'stock.adjusted', 'sale.completed'], [id]);
  const history = useResource(
    () => (isOwner ? listLedgerEvents({ entity: 'product', entityId: id, limit: 20 }) : Promise.resolve([])),
    ['product.changed', 'stock.adjusted', 'sale.completed'],
    [id, isOwner],
  );

  async function remove() {
    const p = product.data;
    if (!p) return;
    const ok = await confirm({
      title: `Delete ${p.name}?`,
      message: 'This removes the product from your inventory. Its history stays in your records.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteProduct(p.id);
      publish({ type: 'product.changed', productId: p.id, change: 'deleted' });
      goBack('/(tabs)/inventory');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (product.loading) {
    return (
      <Screen edges={[]}>
        <Skeleton height={180} />
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  const p = product.data;
  if (!p) {
    return (
      <Screen edges={[]}>
        <ErrorState message={product.error ?? 'This product could not be loaded.'} onRetry={product.retry} />
      </Screen>
    );
  }

  const margin = p.costPrice !== undefined ? p.sellingPrice - p.costPrice : undefined;

  return (
    <Screen edges={[]} refreshing={product.refreshing} onRefresh={product.reload}>
      <Stack.Screen options={{ title: p.name }} />

      <Card style={styles.hero}>
        <ProductImage product={p} size={112} />
        <View style={styles.heroText}>
          <AppText variant="title">{p.name}</AppText>
          <StockBadge product={p} />
          {p.sku ? (
            <AppText variant="caption" tone="muted">
              SKU {p.sku}
            </AppText>
          ) : null}
          {p.barcode ? (
            <AppText variant="caption" tone="muted">
              Barcode {p.barcode}
            </AppText>
          ) : null}
        </View>
      </Card>

      <StatGrid>
        <StatCard label="Selling price" value={formatNaira(p.sellingPrice)} icon="pricetag-outline" />
        {p.costPrice !== undefined ? <StatCard label="Cost price" value={formatNaira(p.costPrice)} icon="cart-outline" /> : null}
        {margin !== undefined ? (
          <StatCard label="Profit per item" value={formatNaira(margin)} tone={margin >= 0 ? 'positive' : 'negative'} icon="trending-up-outline" />
        ) : null}
        <StatCard label="In stock" value={String(p.stockQty)} icon="cube-outline" hint={`Alert at ${p.lowStockThreshold}`} />
        {p.costPrice !== undefined ? <StatCard label="Stock value" value={formatNaira(p.costPrice * Math.max(0, p.stockQty))} icon="wallet-outline" /> : null}
      </StatGrid>

      {isOwner ? (
        adjusting ? (
          <Section title="Adjust stock" description="Recorded in the product's stock history">
            <StockAdjuster productId={p.id} current={p.stockQty} onDone={() => setAdjusting(false)} />
          </Section>
        ) : (
          <View style={styles.row}>
            <Button label="Adjust stock" icon="swap-vertical-outline" variant="secondary" onPress={() => setAdjusting(true)} style={styles.flexButton} />
            <Button label="Edit" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/product/form', params: { id: p.id } })} style={styles.flexButton} />
          </View>
        )
      ) : (
        <AppText variant="caption" tone="muted">
          Only the business owner can change products and stock.
        </AppText>
      )}

      {isOwner ? (
        <Section title="Stock history" description="Every sale and stock change for this product">
          {history.loading ? (
            <Skeleton height={60} />
          ) : (history.data ?? []).length === 0 ? (
            <AppText tone="muted">No changes recorded yet.</AppText>
          ) : (
            (history.data ?? []).map((e, i, arr) => <ActivityItem key={e.id} event={e} actorName={actorName} last={i === arr.length - 1} />)
          )}
        </Section>
      ) : null}

      {error ? <InlineError message={error} /> : null}
      {isOwner ? (
        <Button label="Delete product" icon="trash-outline" variant="destructive" onPress={remove} loading={deleting} style={styles.delete} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroText: { flex: 1, gap: spacing.xs + 2 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flexButton: { flex: 1, alignSelf: 'auto' },
  adjuster: { gap: spacing.md },
  delete: { alignSelf: 'center' },
});

