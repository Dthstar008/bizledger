import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { addRepayment, getCustomer } from '../../src/api/customers';
import { apiErrorMessage } from '../../src/api/client';
import { CustomerDetail, TransactionChannel } from '../../src/api/types';
import { formatNaira } from '../../src/utils/currency';
import { useAuthStore } from '../../src/store/auth-store';
import { buildDebtReminderText, openWhatsApp } from '../../src/utils/whatsapp';
import { colors, radius, spacing } from '../../src/theme';
import { useFocusLoad } from '../../src/hooks/useFocusLoad';

const REPAYMENT_CHANNELS: { value: TransactionChannel; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'opay', label: 'OPay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'pos', label: 'POS' },
  { value: 'other', label: 'Other' },
];

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const businessName = useAuthStore((s) => s.business?.name ?? 'Your business');
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentChannel, setRepaymentChannel] = useState<TransactionChannel>('cash');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setCustomer(await getCustomer(id));
    } catch (err) {
      Alert.alert('Could not load customer', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusLoad(load);

  async function handleRepayment() {
    if (!id) return;
    setSubmitting(true);
    try {
      await addRepayment(id, { amount: parseFloat(repaymentAmount), channel: repaymentChannel });
      setRepaymentAmount('');
      load();
    } catch (err) {
      Alert.alert('Could not record repayment', apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!customer) {
    return (
      <ScreenContainer refreshing={loading} onRefresh={load}>
        <Text style={styles.muted}>{loading ? 'Loading…' : 'Customer not found'}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer refreshing={loading} onRefresh={load}>
      <View style={styles.header}>
        <Text style={styles.name}>{customer.name}</Text>
        {customer.phone ? <Text style={styles.muted}>{customer.phone}</Text> : null}
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Outstanding</Text>
        <Text style={styles.balanceValue}>{formatNaira(customer.outstandingBalance)}</Text>
      </View>

      {customer.outstandingBalance > 0 && (
        <Button
          label="Send debt reminder on WhatsApp"
          variant="secondary"
          onPress={() =>
            openWhatsApp(
              buildDebtReminderText(businessName, customer.name, customer.outstandingBalance),
              customer.phone,
            )
          }
        />
      )}

      {customer.outstandingBalance > 0 && (
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Record a repayment</Text>
          <Text style={styles.formLabel}>Received via</Text>
          <View style={styles.chipRow}>
            {REPAYMENT_CHANNELS.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setRepaymentChannel(c.value)}
                style={[styles.chip, repaymentChannel === c.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, repaymentChannel === c.value && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextField
            label="Amount (₦)"
            value={repaymentAmount}
            onChangeText={setRepaymentAmount}
            keyboardType="numeric"
            placeholder="5000"
          />
          <Button
            label="Save repayment"
            onPress={handleRepayment}
            loading={submitting}
            disabled={
              !repaymentAmount || parseFloat(repaymentAmount) <= 0 || parseFloat(repaymentAmount) > customer.outstandingBalance
            }
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Credit history</Text>
        {customer.creditSales.length === 0 ? (
          <Text style={styles.muted}>No credit sales yet.</Text>
        ) : (
          customer.creditSales.map((sale) => (
            <View key={sale.id} style={styles.creditSaleRow}>
              <View style={styles.rowBetween}>
                <Text style={styles.rowLabel}>{new Date(sale.createdAt).toLocaleDateString()}</Text>
                <Text style={styles.rowValueNegative}>+{formatNaira(sale.creditAmount)}</Text>
              </View>
              <Text style={sale.paymentStatus === 'paid' ? styles.saleStatusPaid : styles.saleStatusOpen}>
                {sale.paymentStatus === 'paid'
                  ? 'Paid off'
                  : sale.paymentStatus === 'partially_paid'
                    ? `${formatNaira(sale.outstandingBalance)} still owed`
                    : 'Nothing paid yet'}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Repayments</Text>
        {customer.repayments.length === 0 ? (
          <Text style={styles.muted}>No repayments yet.</Text>
        ) : (
          customer.repayments.map((r) => (
            <View key={r.id} style={styles.rowBetween}>
              <Text style={styles.rowLabel}>
                {new Date(r.createdAt).toLocaleDateString()} · {REPAYMENT_CHANNELS.find((c) => c.value === r.channel)?.label ?? r.channel}
              </Text>
              <Text style={styles.rowValuePositive}>-{formatNaira(r.amount)}</Text>
            </View>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  muted: {
    color: colors.textMuted,
  },
  balanceCard: {
    backgroundColor: colors.dangerMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.danger,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: colors.textMuted,
  },
  rowValueNegative: {
    color: colors.danger,
    fontWeight: '600',
  },
  rowValuePositive: {
    color: colors.primary,
    fontWeight: '600',
  },
  creditSaleRow: {
    gap: 2,
  },
  saleStatusPaid: {
    fontSize: 12,
    color: colors.primary,
  },
  saleStatusOpen: {
    fontSize: 12,
    color: colors.warning,
  },
  formLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
