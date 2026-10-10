import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Card, Section } from '../../src/components/Card';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { IconButton } from '../../src/components/IconButton';
import { TextField } from '../../src/components/TextField';
import { ProductImage } from '../../src/components/ProductImage';
import { BarcodeScanner } from '../../src/components/BarcodeScanner';
import { ErrorState, InlineError, SkeletonList } from '../../src/components/Feedback';
import { createProduct, getProduct, removeProductImage, updateProduct, uploadProductImage } from '../../src/api/products';
import { apiErrorMessage } from '../../src/api/client';
import { Product } from '../../src/api/types';
import { publish } from '../../src/events/bus';
import { goBack } from '../../src/utils/navigation';
import { PickedPhoto, pickProductPhoto } from '../../src/utils/photo';
import { parseAmount, parseWholeNumber } from '../../src/utils/validate';
import { spacing } from '../../src/theme';

type PhotoChange = { kind: 'keep' } | { kind: 'set'; photo: PickedPhoto } | { kind: 'remove' };

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const [original, setOriginal] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(editing);

  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [lowStock, setLowStock] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' });
  const [scanning, setScanning] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const p = await getProduct(id);
      setOriginal(p);
      setName(p.name);
      setSellingPrice(String(p.sellingPrice));
      setCostPrice(p.costPrice !== undefined ? String(p.costPrice) : '');
      setStockQty(String(p.stockQty));
      setLowStock(String(p.lowStockThreshold));
      setSku(p.sku ?? '');
      setBarcode(p.barcode ?? '');
    } catch (err) {
      setLoadError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sell = parseAmount(sellingPrice);
  const cost = parseAmount(costPrice);
  const stock = parseWholeNumber(stockQty);
  const low = lowStock.trim() ? parseWholeNumber(lowStock) : 0;
  const errors = {
    name: touched && !name.trim() ? 'Enter a product name' : undefined,
    sell: touched && (sell === null || sell < 0) ? 'Enter the price you sell it for' : undefined,
    cost: touched && (cost === null || cost < 0) ? 'Enter what one costs you' : undefined,
    stock: !editing && touched && (stock === null || stock < 0) ? 'Enter how many you have now (0 is fine)' : undefined,
    low: touched && (low === null || low < 0) ? 'Use a whole number' : undefined,
  };
  const valid = name.trim() && sell !== null && sell >= 0 && cost !== null && cost >= 0 && (editing || (stock !== null && stock >= 0)) && low !== null && low >= 0;

  async function choosePhoto(source: 'camera' | 'library') {
    setError(null);
    const result = await pickProductPhoto(source);
    if ('photo' in result) setPhoto({ kind: 'set', photo: result.photo });
    else if ('error' in result) setError(result.error);
  }

  async function save() {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const fields = {
        name: name.trim(),
        sellingPrice: sell!,
        costPrice: cost!,
        lowStockThreshold: low!,
        sku: sku.trim() || undefined,
        barcode: barcode.trim(),
      };
      let product: Product;
      if (editing && original) {
        product = await updateProduct(original.id, fields);
      } else {
        product = await createProduct({ ...fields, barcode: fields.barcode || undefined, stockQty: stock! });
      }
      publish({ type: 'product.changed', productId: product.id, change: editing ? 'updated' : 'created' });

      // The product is saved at this point; a photo failure shouldn't lose the rest.
      try {
        if (photo.kind === 'set') {
          await uploadProductImage(product.id, photo.photo);
          publish({ type: 'product.changed', productId: product.id, change: 'photo' });
        } else if (photo.kind === 'remove' && product.imageUpdatedAt) {
          await removeProductImage(product.id);
          publish({ type: 'product.changed', productId: product.id, change: 'photo' });
        }
      } catch (err) {
        setError(`The product was saved, but the photo wasn't: ${apiErrorMessage(err)}`);
        setSaving(false);
        return;
      }
      goBack('/(tabs)/inventory');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen edges={[]}>
        <SkeletonList rows={4} />
      </Screen>
    );
  }
  if (editing && !original) {
    return (
      <Screen edges={[]}>
        <ErrorState message={loadError ?? 'This product could not be loaded.'} onRetry={load} />
      </Screen>
    );
  }

  const preview = { id: original?.id ?? 'new', name: name || 'New product', imageUpdatedAt: photo.kind === 'remove' ? null : original?.imageUpdatedAt ?? null };
  const hasPhoto = photo.kind === 'set' || (photo.kind === 'keep' && !!original?.imageUpdatedAt);

  return (
    <Screen
      edges={[]}
      footer={<Button label={editing ? 'Save changes' : 'Add product'} icon="checkmark" onPress={save} loading={saving} fullWidth />}
    >
      <Stack.Screen options={{ title: editing ? 'Edit product' : 'New product' }} />
      {error ? <InlineError message={error} /> : null}

      <Card style={styles.photoCard}>
        <ProductImage product={preview} localUri={photo.kind === 'set' ? photo.photo.uri : null} size={120} />
        <View style={styles.photoActions}>
          <AppText variant="bodyStrong">Product photo</AppText>
          <AppText variant="caption" tone="muted">
            Optional. Helps staff find the right item quickly.
          </AppText>
          <View style={styles.row}>
            <Button label="Take photo" icon="camera-outline" size="sm" variant="secondary" onPress={() => choosePhoto('camera')} />
            <Button label="Choose" icon="images-outline" size="sm" variant="secondary" onPress={() => choosePhoto('library')} />
          </View>
          {hasPhoto ? <Button label="Remove photo" icon="trash-outline" size="sm" variant="ghost" onPress={() => setPhoto({ kind: 'remove' })} /> : null}
        </View>
      </Card>

      <Section title="Details">
        <TextField label="Product name" value={name} onChangeText={setName} placeholder="Oraimo charger" autoCapitalize="words" error={errors.name} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="Selling price" prefix="₦" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" placeholder="9000" error={errors.sell} />
          </View>
          <View style={styles.flex}>
            <TextField label="Cost price" prefix="₦" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" placeholder="6000" error={errors.cost} />
          </View>
        </View>
        {sell !== null && cost !== null && sell > 0 ? (
          <AppText variant="caption" tone={sell - cost >= 0 ? 'primary' : 'danger'}>
            Profit per item: ₦{(sell - cost).toLocaleString('en-NG')}
          </AppText>
        ) : null}
      </Section>

      <Section title="Stock">
        <View style={styles.row}>
          <View style={styles.flex}>
            {editing ? (
              <TextField label="In stock" value={stockQty} editable={false} helper="Use “Adjust stock” on the product page" />
            ) : (
              <TextField label="Starting stock" value={stockQty} onChangeText={setStockQty} keyboardType="number-pad" placeholder="20" error={errors.stock} />
            )}
          </View>
          <View style={styles.flex}>
            <TextField label="Low-stock alert at" value={lowStock} onChangeText={setLowStock} keyboardType="number-pad" placeholder="5" error={errors.low} />
          </View>
        </View>
      </Section>

      <Section title="Identifiers" description="Optional">
        <TextField label="SKU" value={sku} onChangeText={setSku} placeholder="ORA-CHG-01" autoCapitalize="characters" />
        <View style={styles.barcodeRow}>
          <View style={styles.flex}>
            <TextField label="Barcode" value={barcode} onChangeText={setBarcode} placeholder="Scan or type" keyboardType="number-pad" />
          </View>
          <IconButton icon="barcode-outline" variant="filled" accessibilityLabel="Scan barcode" onPress={() => setScanning(true)} />
        </View>
      </Section>

      <BarcodeScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onScanned={(code) => {
          setBarcode(code);
          setScanning(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  photoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photoActions: { flex: 1, gap: spacing.sm },
  barcodeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
});
