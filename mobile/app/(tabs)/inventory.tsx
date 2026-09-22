import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { createProduct, listProducts } from '../../src/api/products';
import { apiErrorMessage } from '../../src/api/client';
import { Product } from '../../src/api/types';
import { formatNaira } from '../../src/utils/currency';
import { colors, radius, spacing } from '../../src/theme';
import { useFocusLoad } from '../../src/hooks/useFocusLoad';

export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await listProducts());
    } catch (err) {
      Alert.alert('Could not load inventory', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusLoad(load);

  return (
    <ScreenContainer refreshing={loading} onRefresh={load}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Inventory</Text>
        <Button label={showForm ? 'Cancel' : 'Add product'} variant="secondary" onPress={() => setShowForm((v) => !v)} />
      </View>

      {showForm && (
        <NewProductForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {products.length === 0 && !loading ? (
        <Text style={styles.empty}>No products yet. Add your first one above.</Text>
      ) : (
        products.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={p.stockQty <= p.lowStockThreshold ? styles.stockLow : styles.stock}>
                {p.stockQty} in stock
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Cost {formatNaira(p.costPrice)}</Text>
              <Text style={styles.priceLabel}>Sells {formatNaira(p.sellingPrice)}</Text>
              <Text style={styles.priceLabel}>Value {formatNaira(p.costPrice * p.stockQty)}</Text>
            </View>
          </View>
        ))
      )}
    </ScreenContainer>
  );
}

function NewProductForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim() && costPrice && sellingPrice && stockQty;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await createProduct({
        name: name.trim(),
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        stockQty: parseInt(stockQty, 10),
      });
      onCreated();
    } catch (err) {
      Alert.alert('Could not add product', apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      <TextField label="Product name" value={name} onChangeText={setName} placeholder="Oraimo Charger" />
      <TextField label="Cost price (₦)" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" placeholder="6000" />
      <TextField label="Selling price (₦)" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" placeholder="9000" />
      <TextField label="Starting stock" value={stockQty} onChangeText={setStockQty} keyboardType="numeric" placeholder="20" />
      <Button label="Save product" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stock: {
    color: colors.textMuted,
  },
  stockLow: {
    color: colors.warning,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  priceLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
