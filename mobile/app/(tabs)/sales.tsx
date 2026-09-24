import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { Button } from '../../src/components/Button';
import { listSales } from '../../src/api/sales';
import { apiErrorMessage } from '../../src/api/client';
import { Sale } from '../../src/api/types';
import { formatNaira } from '../../src/utils/currency';
import { colors, radius, spacing } from '../../src/theme';
import { PaymentStatus } from '../../src/api/types';
import { useFocusLoad } from '../../src/hooks/useFocusLoad';

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: 'Paid',
  partially_paid: 'Partially paid',
  credit: 'On credit',
  unpaid: 'Unpaid',
};

export default function SalesScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSales(await listSales());
    } catch (err) {
      Alert.alert('Could not load sales', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusLoad(load);

  return (
    <ScreenContainer refreshing={loading} onRefresh={load}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Sales</Text>
        <Button label="New sale" onPress={() => router.push('/sale/new')} />
      </View>

      {sales.length === 0 && !loading ? (
        <Text style={styles.empty}>No sales recorded yet.</Text>
      ) : (
        sales.map((sale) => (
          <View key={sale.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.itemSummary}>
                {sale.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
              </Text>
              <Text style={styles.total}>{formatNaira(sale.totalAmount)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.badge}>{sale.paymentMethod}</Text>
              <Text style={[styles.statusBadge, sale.paymentStatus === 'paid' ? styles.statusPaid : styles.statusUnpaid]}>
                {PAYMENT_STATUS_LABEL[sale.paymentStatus]}
              </Text>
              {!sale.verified && sale.paymentMethod !== 'credit' && (
                <Text style={styles.unverified}>Unverified</Text>
              )}
              {sale.customer ? <Text style={styles.muted}>{sale.customer.name}</Text> : null}
              <Text style={styles.muted}>{new Date(sale.createdAt).toLocaleDateString()}</Text>
            </View>
            {sale.paymentReference ? <Text style={styles.muted}>Ref: {sale.paymentReference}</Text> : null}
            {sale.outstandingBalance > 0 && (
              <Text style={styles.credit}>{formatNaira(sale.outstandingBalance)} still owed</Text>
            )}
          </View>
        ))
      )}
    </ScreenContainer>
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
    gap: spacing.sm,
  },
  itemSummary: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
  },
  total: {
    color: colors.text,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  badge: {
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    textTransform: 'capitalize',
  },
  muted: {
    fontSize: 12,
    color: colors.textMuted,
  },
  credit: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  statusBadge: {
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    fontWeight: '600',
  },
  statusPaid: {
    color: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  statusUnpaid: {
    color: colors.warning,
    backgroundColor: colors.warningMuted,
  },
  unverified: {
    fontSize: 12,
    color: colors.danger,
    backgroundColor: colors.dangerMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    fontWeight: '600',
  },
});
