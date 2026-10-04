import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { IconButton } from '../../src/components/IconButton';
import { TextField } from '../../src/components/TextField';
import { SearchBar } from '../../src/components/SearchBar';
import { Section } from '../../src/components/Card';
import { Chip, ChipGroup } from '../../src/components/Chip';
import { AppText } from '../../src/components/AppText';
import { ProductImage } from '../../src/components/ProductImage';
import { BarcodeScanner } from '../../src/components/BarcodeScanner';
import { ErrorState, InlineError, SkeletonList, confirm } from '../../src/components/Feedback';
import { findProductByBarcode, listProducts } from '../../src/api/products';
import { listCustomers } from '../../src/api/customers';
import { createSale } from '../../src/api/sales';
import { apiErrorMessage } from '../../src/api/client';
import { Customer, PaymentMethod, Product, TransactionChannel } from '../../src/api/types';
import { publish } from '../../src/events/bus';
import { goBack } from '../../src/utils/navigation';
import { useResource } from '../../src/hooks/useResource';
import { useAuthStore } from '../../src/store/auth-store';
import { buildReceiptText, openWhatsApp } from '../../src/utils/whatsapp';
import { formatNaira } from '../../src/utils/currency';
import { parseAmount } from '../../src/utils/validate';
import { colors, radius, spacing, touch } from '../../src/theme';

interface CartLine {
  productId: string;
  productName: string;
  unitPrice: number;
  catalogPrice: number;
  quantity: number;
  maxStock: number;
}

const METHODS: { value: PaymentMethod; label: string; icon: 'cash-outline' | 'swap-horizontal-outline' | 'card-outline' | 'time-outline' }[] = [
  { value: 'cash', label: 'Cash', icon: 'cash-outline' },
  { value: 'transfer', label: 'Transfer', icon: 'swap-horizontal-outline' },
  { value: 'pos', label: 'POS', icon: 'card-outline' },
  { value: 'credit', label: 'Credit', icon: 'time-outline' },
];

const CHANNELS: { value: TransactionChannel; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'opay', label: 'OPay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'other', label: 'Other' },
];

const PRODUCTS_SHOWN = 8;

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <View style={styles.stepper} accessibilityLabel={`${label} quantity ${value}`}>
      <IconButton icon="remove" size={18} accessibilityLabel={`One less ${label}`} disabled={value <= min} onPress={() => onChange(value - 1)} />
      <AppText variant="bodyStrong" style={styles.stepperValue}>
        {value}
      </AppText>
      <IconButton icon="add" size={18} accessibilityLabel={`One more ${label}`} disabled={value >= max} onPress={() => onChange(value + 1)} />
    </View>
  );
}

export default function NewSaleScreen() {
  const businessName = useAuthStore((s) => s.business?.name ?? 'Your business');
  const products = useResource(listProducts, ['product.changed', 'stock.adjusted', 'sale.completed']);
  const customers = useResource(listCustomers, ['customer.changed']);

  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [channel, setChannel] = useState<TransactionChannel>('bank_transfer');
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [customerQuery, setCustomerQuery] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [reference, setReference] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const total = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const qtyOf = (id: string) => cart.find((l) => l.productId === id)?.quantity ?? 0;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (products.data ?? []).filter(
      (p) => !q || p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q) || (p.barcode ?? '').includes(q),
    );
    return q ? list : list.slice(0, PRODUCTS_SHOWN);
  }, [products.data, query]);

  const customerMatches = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    return (customers.data ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)).slice(0, 12);
  }, [customers.data, customerQuery]);
  const selectedCustomer: Customer | undefined = customers.data?.find((c) => c.id === customerId);

  function setQty(product: Pick<Product, 'id' | 'name' | 'sellingPrice' | 'stockQty'>, quantity: number) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (quantity <= 0) return prev.filter((l) => l.productId !== product.id);
      const q = Math.min(quantity, product.stockQty);
      if (existing) return prev.map((l) => (l.productId === product.id ? { ...l, quantity: q } : l));
      return [
        ...prev,
        { productId: product.id, productName: product.name, unitPrice: product.sellingPrice, catalogPrice: product.sellingPrice, quantity: q, maxStock: product.stockQty },
      ];
    });
  }

  async function handleScan(code: string) {
    setScanning(false);
    setNotice(null);
    try {
      const product = products.data?.find((p) => p.barcode === code) ?? (await findProductByBarcode(code));
      if (!product) return setNotice(`No product has barcode ${code}. Add it in Inventory first.`);
      if (product.stockQty < 1) return setNotice(`${product.name} is out of stock.`);
      setQty(product, qtyOf(product.id) + 1);
    } catch (err) {
      setNotice(apiErrorMessage(err));
    }
  }

  function savePrice(productId: string) {
    const parsed = parseAmount(priceInput);
    if (parsed !== null && parsed >= 0) {
      setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, unitPrice: parsed } : l)));
    }
    setEditing(null);
  }

  const paid = method === 'credit' ? parseAmount(amountPaid) ?? 0 : undefined;
  const blocker =
    cart.length === 0
      ? 'Add at least one product'
      : method === 'credit' && !customerId
        ? 'Choose who is buying on credit'
        : paid !== undefined && (paid < 0 || paid > total)
          ? 'Amount paid now cannot be more than the total'
          : null;

  async function complete() {
    if (blocker) return;
    setSubmitting(true);
    setError(null);
    try {
      const sale = await createSale({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
        paymentMethod: method,
        customerId,
        amountPaid: paid,
        paymentReference: reference.trim() || undefined,
        channel: method === 'transfer' ? channel : undefined,
      });
      publish({ type: 'sale.completed', sale });
      const send = await confirm({
        title: 'Sale recorded',
        message: `${formatNaira(sale.totalAmount)}. Send the customer a receipt on WhatsApp?`,
        confirmLabel: 'Send receipt',
      });
      if (send) await openWhatsApp(buildReceiptText(businessName, sale), selectedCustomer?.phone);
      goBack('/(tabs)/sales');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const footer = (
    <>
      <View style={styles.totalRow}>
        <AppText tone="muted">
          {itemCount} item{itemCount === 1 ? '' : 's'}
        </AppText>
        <AppText variant="title">{formatNaira(total)}</AppText>
      </View>
      {blocker && cart.length > 0 ? (
        <AppText variant="caption" tone="warning" align="center">
          {blocker}
        </AppText>
      ) : null}
      <Button label="Complete sale" icon="checkmark" onPress={complete} loading={submitting} disabled={!!blocker} fullWidth />
    </>
  );

  if (products.loading) {
    return (
      <Screen edges={[]}>
        <SkeletonList rows={5} />
      </Screen>
    );
  }
  if (!products.data) {
    return (
      <Screen edges={[]}>
        <ErrorState message={products.error ?? 'Products could not be loaded.'} onRetry={products.retry} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]} footer={footer}>
      {error ? <InlineError message={error} /> : null}

      <Section title="Add products" card={false}>
        <View style={styles.searchRow}>
          <View style={styles.flex}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search products" />
          </View>
          <IconButton icon="barcode-outline" variant="filled" accessibilityLabel="Scan a barcode" onPress={() => setScanning(true)} />
        </View>
        {notice ? <InlineError message={notice} /> : null}
        <View style={styles.productList}>
          {products.data.length === 0 ? (
            <AppText tone="muted">You have no products yet. Add some in Inventory first.</AppText>
          ) : matches.length === 0 ? (
            <AppText tone="muted">No products match “{query}”.</AppText>
          ) : (
            matches.map((p, i) => {
              const qty = qtyOf(p.id);
              const out = p.stockQty < 1;
              return (
                <View key={p.id} style={[styles.productRow, i < matches.length - 1 && styles.separator, out && styles.disabled]}>
                  <ProductImage product={p} size={44} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {p.name}
                    </AppText>
                    <AppText variant="caption" tone={out ? 'danger' : p.stockQty <= p.lowStockThreshold ? 'warning' : 'muted'}>
                      {formatNaira(p.sellingPrice)} · {out ? 'Out of stock' : `${p.stockQty} in stock`}
                    </AppText>
                  </View>
                  {qty > 0 ? (
                    <Stepper value={qty} min={0} max={p.stockQty} label={p.name} onChange={(v) => setQty(p, v)} />
                  ) : (
                    <Button label="Add" icon="add" size="sm" variant="secondary" disabled={out} onPress={() => setQty(p, 1)} accessibilityLabel={`Add ${p.name}`} />
                  )}
                </View>
              );
            })
          )}
          {!query && products.data.length > PRODUCTS_SHOWN ? (
            <AppText variant="caption" tone="subtle" align="center">
              Showing {PRODUCTS_SHOWN} of {products.data.length}. Search to find more.
            </AppText>
          ) : null}
        </View>
      </Section>

      {cart.length > 0 ? (
        <Section title={`Cart (${itemCount})`}>
          {cart.map((line, i) => (
            <View key={line.productId} style={[styles.cartLine, i < cart.length - 1 && styles.separator]}>
              <View style={styles.cartHead}>
                <AppText variant="bodyStrong" style={styles.flex} numberOfLines={2}>
                  {line.productName}
                </AppText>
                <AppText variant="bodyStrong">{formatNaira(line.unitPrice * line.quantity)}</AppText>
              </View>
              {editing === line.productId ? (
                <View style={styles.priceEdit}>
                  <View style={styles.flex}>
                    <TextField
                      label="Price per item"
                      prefix="₦"
                      value={priceInput}
                      onChangeText={setPriceInput}
                      keyboardType="numeric"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={() => savePrice(line.productId)}
                    />
                  </View>
                  <Button label="Save" size="sm" onPress={() => savePrice(line.productId)} style={styles.priceSave} />
                </View>
              ) : (
                <View style={styles.cartControls}>
                  <Pressable
                    onPress={() => {
                      setEditing(line.productId);
                      setPriceInput(String(line.unitPrice));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Change price of ${line.productName}`}
                    style={styles.priceLink}
                    hitSlop={6}
                  >
                    <AppText variant="caption" tone="muted">
                      {formatNaira(line.unitPrice)} each
                      {line.unitPrice !== line.catalogPrice ? ` (was ${formatNaira(line.catalogPrice)})` : ''}
                    </AppText>
                    <Ionicons name="pencil" size={13} color={colors.primary} />
                  </Pressable>
                  <Stepper
                    value={line.quantity}
                    min={0}
                    max={line.maxStock}
                    label={line.productName}
                    onChange={(v) => setQty({ id: line.productId, name: line.productName, sellingPrice: line.catalogPrice, stockQty: line.maxStock }, v)}
                  />
                </View>
              )}
            </View>
          ))}
        </Section>
      ) : null}

      <Section title="Payment">
        <ChipGroup options={METHODS} value={method} onChange={setMethod} />
        {method === 'transfer' ? (
          <View style={styles.subgroup}>
            <AppText variant="label" tone="muted">
              Received via
            </AppText>
            <ChipGroup options={CHANNELS} value={channel} onChange={setChannel} />
          </View>
        ) : null}
        {method === 'credit' ? (
          <TextField
            label="Amount paid now (optional)"
            prefix="₦"
            value={amountPaid}
            onChangeText={setAmountPaid}
            keyboardType="numeric"
            placeholder="0"
            helper={total > 0 ? `${formatNaira(Math.max(0, total - (parseAmount(amountPaid) ?? 0)))} will be added to the customer's balance` : undefined}
          />
        ) : null}
        {method === 'transfer' || method === 'pos' ? (
          <>
            <TextField label="Reference (optional)" value={reference} onChangeText={setReference} placeholder="From the bank alert or POS slip" autoCapitalize="characters" />
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
              <AppText variant="caption" style={styles.flex}>
                Recorded as unverified until confirmed with your bank or POS provider.
              </AppText>
            </View>
          </>
        ) : null}
      </Section>

      <Section
        title={method === 'credit' ? 'Customer (required)' : 'Customer (optional)'}
        action={<Button label="New" icon="person-add-outline" size="sm" variant="ghost" onPress={() => router.push('/customer/form')} />}
      >
        {selectedCustomer ? (
          <View style={styles.selected}>
            <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
            <AppText variant="bodyStrong" style={styles.flex}>
              {selectedCustomer.name}
            </AppText>
            <Button label="Change" size="sm" variant="ghost" onPress={() => setCustomerId(undefined)} />
          </View>
        ) : (customers.data ?? []).length === 0 ? (
          <AppText tone="muted">No customers yet. Tap “New” to add one.</AppText>
        ) : (
          <>
            {(customers.data ?? []).length > 8 ? <SearchBar value={customerQuery} onChangeText={setCustomerQuery} placeholder="Search customers" /> : null}
            <View style={styles.chips}>
              {customerMatches.map((c) => (
                <Chip key={c.id} label={c.name} icon="person-outline" onPress={() => setCustomerId(c.id)} />
              ))}
            </View>
          </>
        )}
      </Section>

      <BarcodeScanner visible={scanning} onClose={() => setScanning(false)} onScanned={handleScan} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  productList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: spacing.sm, minHeight: touch.min + 12 },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  disabled: { opacity: 0.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, backgroundColor: colors.surface },
  stepperValue: { minWidth: 24, textAlign: 'center' },
  cartLine: { gap: spacing.sm, paddingBottom: spacing.sm },
  cartHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cartControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  priceLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1, minHeight: touch.min },
  priceEdit: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  priceSave: { marginBottom: 6 },
  subgroup: { gap: spacing.sm },
  notice: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.warningMuted },
  selected: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
