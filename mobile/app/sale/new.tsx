import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { BarcodeScanner } from '../../src/components/BarcodeScanner';
import { useAuthStore } from '../../src/store/auth-store';
import { buildReceiptText, openWhatsApp } from '../../src/utils/whatsapp';
import { findProductByBarcode, listProducts } from '../../src/api/products';
import { listCustomers } from '../../src/api/customers';
import { createSale } from '../../src/api/sales';
import { apiErrorMessage } from '../../src/api/client';
import { Customer, PaymentMethod, Product, TransactionChannel } from '../../src/api/types';
import { formatNaira } from '../../src/utils/currency';
import { colors, radius, spacing } from '../../src/theme';

interface CartLine {
  productId: string;
  productName: string;
  unitPrice: number;
  catalogPrice: number;
  quantity: number;
  maxStock: number;
}

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'transfer', 'pos', 'credit'];

const TRANSFER_CHANNELS: { value: TransactionChannel; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'opay', label: 'OPay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'other', label: 'Other' },
];

export default function NewSaleScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [channel, setChannel] = useState<TransactionChannel>('bank_transfer');
  const [submitting, setSubmitting] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const businessName = useAuthStore((s) => s.business?.name ?? 'Your business');

  useEffect(() => {
    listProducts().then(setProducts).catch((err) => Alert.alert('Could not load products', apiErrorMessage(err)));
    listCustomers().then(setCustomers).catch(() => {});
  }, []);

  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQty) return prev;
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (product.stockQty < 1) return prev;
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unitPrice: product.sellingPrice,
          catalogPrice: product.sellingPrice,
          quantity: 1,
          maxStock: product.stockQty,
        },
      ];
    });
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function startEditPrice(line: CartLine) {
    setEditingProductId(line.productId);
    setPriceInput(String(line.unitPrice));
  }

  function commitPrice(productId: string) {
    const parsed = parseFloat(priceInput);
    if (!isNaN(parsed) && parsed >= 0) {
      setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, unitPrice: parsed } : l)));
    }
    setEditingProductId(null);
  }

  const needsCustomer = paymentMethod === 'credit';
  const paidNumber = amountPaid ? parseFloat(amountPaid) : undefined;
  const canSubmit =
    cart.length > 0 &&
    (!needsCustomer || !!customerId) &&
    (paidNumber === undefined || (paidNumber >= 0 && paidNumber <= total));

  async function handleScan(code: string) {
    setScanning(false);
    try {
      const product = products.find((p) => p.barcode === code) ?? (await findProductByBarcode(code));
      if (!product) {
        Alert.alert('Product not found', `No product is registered with barcode ${code}. Add it in Inventory first.`);
        return;
      }
      if (product.stockQty < 1) {
        Alert.alert('Out of stock', `${product.name} has no stock left.`);
        return;
      }
      addToCart(product);
    } catch (err) {
      Alert.alert('Could not look up barcode', apiErrorMessage(err));
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const sale = await createSale({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
        paymentMethod,
        customerId,
        amountPaid: paidNumber,
        paymentReference: paymentReference.trim() || undefined,
        channel: paymentMethod === 'transfer' ? channel : undefined,
      });
      const customerPhone = customers.find((c) => c.id === customerId)?.phone;
      Alert.alert('Sale recorded', `${formatNaira(sale.totalAmount)} — would you like to send the customer a receipt?`, [
        { text: 'Done', style: 'cancel', onPress: () => router.back() },
        {
          text: 'Send on WhatsApp',
          onPress: async () => {
            await openWhatsApp(buildReceiptText(businessName, sale), customerPhone);
            router.back();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Could not record sale', apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add products</Text>
        <Button label="Scan barcode" variant="secondary" onPress={() => setScanning(true)} />
        <BarcodeScanner visible={scanning} onClose={() => setScanning(false)} onScanned={handleScan} />
        <View style={styles.chipRow}>
          {products.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => addToCart(p)}
              disabled={p.stockQty < 1}
              style={[styles.productChip, p.stockQty < 1 && styles.productChipDisabled]}
            >
              <Text style={styles.productChipText}>{p.name}</Text>
              <Text style={styles.productChipMeta}>
                {formatNaira(p.sellingPrice)} · {p.stockQty} left
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {cart.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cart</Text>
          {cart.map((line) => (
            <View key={line.productId} style={styles.cartLineWrap}>
              <View style={styles.cartRow}>
                <Text style={styles.cartLine}>
                  {line.quantity}× {line.productName}
                </Text>
                <Text style={styles.cartLineTotal}>{formatNaira(line.unitPrice * line.quantity)}</Text>
                <Pressable onPress={() => removeLine(line.productId)}>
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              </View>

              {editingProductId === line.productId ? (
                <View style={styles.priceEditRow}>
                  <TextField
                    label="Unit price (₦)"
                    value={priceInput}
                    onChangeText={setPriceInput}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <View style={styles.priceEditButtons}>
                    <Button label="Cancel" variant="secondary" onPress={() => setEditingProductId(null)} />
                    <Button label="Save price" onPress={() => commitPrice(line.productId)} />
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => startEditPrice(line)} style={styles.priceRow}>
                  <Text style={styles.priceRowText}>
                    @ {formatNaira(line.unitPrice)} each
                    {line.unitPrice !== line.catalogPrice ? `  ·  catalog ${formatNaira(line.catalogPrice)}` : ''}
                  </Text>
                  <Text style={styles.editLink}>Edit price</Text>
                </Pressable>
              )}
            </View>
          ))}
          <View style={styles.cartTotalRow}>
            <Text style={styles.cartTotalLabel}>Total</Text>
            <Text style={styles.cartTotalValue}>{formatNaira(total)}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment method</Text>
        <View style={styles.chipRow}>
          {PAYMENT_METHODS.map((m) => (
            <Pressable
              key={m}
              onPress={() => setPaymentMethod(m)}
              style={[styles.chip, paymentMethod === m && styles.chipActive]}
            >
              <Text style={[styles.chipText, paymentMethod === m && styles.chipTextActive]}>{m}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer {needsCustomer ? '(required)' : '(optional)'}</Text>
        <View style={styles.chipRow}>
          {customers.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCustomerId(customerId === c.id ? undefined : c.id)}
              style={[styles.chip, customerId === c.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, customerId === c.id && styles.chipTextActive]}>{c.name}</Text>
            </Pressable>
          ))}
          {customers.length === 0 && <Text style={styles.muted}>Add a customer from the Customers tab first.</Text>}
        </View>
      </View>

      {paymentMethod === 'credit' && (
        <TextField
          label={`Amount paid now (₦) — leave blank for fully on credit`}
          value={amountPaid}
          onChangeText={setAmountPaid}
          keyboardType="numeric"
          placeholder="0"
        />
      )}

      {paymentMethod === 'transfer' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Received via</Text>
          <View style={styles.chipRow}>
            {TRANSFER_CHANNELS.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setChannel(c.value)}
                style={[styles.chip, channel === c.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, channel === c.value && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {(paymentMethod === 'transfer' || paymentMethod === 'pos') && (
        <View style={styles.section}>
          <TextField
            label="Transaction reference (optional)"
            value={paymentReference}
            onChangeText={setPaymentReference}
            placeholder={paymentMethod === 'transfer' ? 'e.g. bank app reference' : 'e.g. POS slip number'}
          />
          <Text style={styles.verifyNotice}>
            This is recorded as merchant-entered, not verified — automatic verification needs a payment provider
            connection, which isn't set up yet.
          </Text>
        </View>
      )}

      <Button label="Confirm sale" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  productChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
    minWidth: 140,
  },
  productChipDisabled: {
    opacity: 0.4,
  },
  productChipText: {
    color: colors.text,
    fontWeight: '600',
  },
  productChipMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  cartLineWrap: {
    gap: spacing.xs,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRowText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  editLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  priceEditRow: {
    gap: spacing.sm,
  },
  priceEditButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cartLine: {
    flex: 1,
    color: colors.text,
  },
  cartLineTotal: {
    color: colors.text,
    fontWeight: '600',
  },
  remove: {
    color: colors.danger,
    paddingHorizontal: spacing.xs,
  },
  cartTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  cartTotalLabel: {
    fontWeight: '700',
    color: colors.text,
  },
  cartTotalValue: {
    fontWeight: '700',
    color: colors.primary,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  verifyNotice: {
    color: colors.warning,
    fontSize: 12,
  },
});
