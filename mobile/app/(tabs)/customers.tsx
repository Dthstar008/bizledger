import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { createCustomer, listCustomers } from '../../src/api/customers';
import { apiErrorMessage } from '../../src/api/client';
import { Customer } from '../../src/api/types';
import { formatNaira } from '../../src/utils/currency';
import { colors, radius, spacing } from '../../src/theme';
import { useFocusLoad } from '../../src/hooks/useFocusLoad';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCustomers(await listCustomers());
    } catch (err) {
      Alert.alert('Could not load customers', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusLoad(load);

  return (
    <ScreenContainer refreshing={loading} onRefresh={load}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Customers</Text>
        <Button label={showForm ? 'Cancel' : 'Add customer'} variant="secondary" onPress={() => setShowForm((v) => !v)} />
      </View>

      {showForm && (
        <NewCustomerForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {customers.length === 0 && !loading ? (
        <Text style={styles.empty}>No customers yet.</Text>
      ) : (
        customers.map((c) => (
          <Pressable key={c.id} style={styles.card} onPress={() => router.push(`/customer/${c.id}`)}>
            <View>
              <Text style={styles.name}>{c.name}</Text>
              {c.phone ? <Text style={styles.phone}>{c.phone}</Text> : null}
            </View>
            <Text style={c.outstandingBalance > 0 ? styles.balanceOwed : styles.balanceClear}>
              {c.outstandingBalance > 0 ? formatNaira(c.outstandingBalance) : 'No debt'}
            </Text>
          </Pressable>
        ))
      )}
    </ScreenContainer>
  );
}

function NewCustomerForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await createCustomer({ name: name.trim(), phone: phone.trim() || undefined });
      onCreated();
    } catch (err) {
      Alert.alert('Could not add customer', apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.form}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="Chinedu Okafor" />
      <TextField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="080..." />
      <Button label="Save customer" onPress={handleSubmit} loading={submitting} disabled={!name.trim()} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  phone: {
    color: colors.textMuted,
    fontSize: 13,
  },
  balanceOwed: {
    color: colors.danger,
    fontWeight: '700',
  },
  balanceClear: {
    color: colors.textMuted,
  },
});
