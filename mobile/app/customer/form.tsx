import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Section } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { ErrorState, InlineError, SkeletonList } from '../../src/components/Feedback';
import { createCustomer, getCustomer, updateCustomer } from '../../src/api/customers';
import { apiErrorMessage } from '../../src/api/client';
import { CustomerDetail } from '../../src/api/types';
import { publish } from '../../src/events/bus';
import { goBack } from '../../src/utils/navigation';

export default function CustomerFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const [original, setOriginal] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const c = await getCustomer(id);
      setOriginal(c);
      setName(c.name);
      setPhone(c.phone ?? '');
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

  const digits = phone.replace(/[^\d]/g, '');
  const errors = {
    name: touched && !name.trim() ? 'Enter the customer’s name' : undefined,
    phone: touched && phone.trim() && digits.length < 7 ? 'This phone number looks too short' : undefined,
  };
  const valid = !!name.trim() && (!phone.trim() || digits.length >= 7);

  async function save() {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), phone: phone.trim() || undefined };
      if (editing && original) {
        await updateCustomer(original.id, { ...payload, phone: phone.trim() });
        publish({ type: 'customer.changed', customerId: original.id, change: 'updated' });
      } else {
        const created = await createCustomer(payload);
        publish({ type: 'customer.changed', customerId: created.id, change: 'created' });
      }
      goBack('/(tabs)/customers');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen edges={[]}>
        <SkeletonList rows={2} />
      </Screen>
    );
  }
  if (editing && !original) {
    return (
      <Screen edges={[]}>
        <ErrorState message={loadError ?? 'This customer could not be loaded.'} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]} footer={<Button label={editing ? 'Save changes' : 'Add customer'} icon="checkmark" onPress={save} loading={saving} fullWidth />}>
      <Stack.Screen options={{ title: editing ? 'Edit customer' : 'New customer' }} />
      {error ? <InlineError message={error} /> : null}
      <Section title="Customer details" description="A phone number lets you call them or send WhatsApp reminders.">
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Chinedu Okafor"
          autoCapitalize="words"
          returnKeyType="next"
          error={errors.name}
          autoFocus={!editing}
        />
        <TextField
          label="Phone (optional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="0803 123 4567"
          keyboardType="phone-pad"
          returnKeyType="done"
          onSubmitEditing={save}
          error={errors.phone}
        />
      </Section>
    </Screen>
  );
}
