import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Section } from '../../src/components/Card';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { ChipGroup } from '../../src/components/Chip';
import { TextField } from '../../src/components/TextField';
import { ActivityItem } from '../../src/components/ActivityItem';
import { ErrorState, InlineError, Skeleton, SkeletonList, confirm } from '../../src/components/Feedback';
import { deleteExpense, getExpense, updateExpense } from '../../src/api/expenses';
import { recordExpense } from '../../src/offline/outbox';
import { listLedgerEvents } from '../../src/api/ledger';
import { apiErrorMessage } from '../../src/api/client';
import { Expense, ExpenseCategory } from '../../src/api/types';
import { publish } from '../../src/events/bus';
import { useResource } from '../../src/hooks/useResource';
import { useTeamNames } from '../../src/hooks/useTeamNames';
import { formatNaira } from '../../src/utils/currency';
import { EXPENSE_CATEGORIES, expenseCategory } from '../../src/utils/expenses';
import { formatDateTime } from '../../src/utils/format';
import { goBack } from '../../src/utils/navigation';
import { parseAmount } from '../../src/utils/validate';

export default function ExpenseFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const actorName = useTeamNames();
  const [original, setOriginal] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = useResource(
    () => (id ? listLedgerEvents({ entity: 'expense', entityId: id, limit: 10 }) : Promise.resolve([])),
    ['expense.changed'],
    [id],
  );

  async function load() {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const e = await getExpense(id);
      setOriginal(e);
      setCategory(e.category);
      setAmount(String(e.amount));
      setDescription(e.description ?? '');
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

  const value = parseAmount(amount);
  const errors = {
    category: touched && !category ? 'Choose what the money was spent on' : undefined,
    amount: touched && (value === null || value <= 0) ? 'Enter how much was spent' : undefined,
  };
  const valid = !!category && value !== null && value > 0;

  async function save() {
    setTouched(true);
    if (!valid || !category || value === null) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { category, amount: value, description: description.trim() || undefined };
      if (editing && original) {
        await updateExpense(original.id, { ...payload, description: description.trim() });
        publish({ type: 'expense.changed', expenseId: original.id, change: 'updated', amount: value });
      } else {
        // Saved on the phone instead when there's no connection; it syncs by itself later.
        const result = await recordExpense(payload);
        if (result.status === 'saved') publish({ type: 'expense.changed', expenseId: result.record.id, change: 'created', amount: value });
      }
      goBack('/(tabs)/expenses');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!original) return;
    const ok = await confirm({
      title: 'Delete this expense?',
      message: `${formatNaira(original.amount)} for ${expenseCategory(original.category).label.toLowerCase()} will be removed from your totals. The deletion is kept in your records.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteExpense(original.id);
      publish({ type: 'expense.changed', expenseId: original.id, change: 'deleted', amount: original.amount });
      goBack('/(tabs)/expenses');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Screen edges={[]}>
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  if (editing && !original) {
    return (
      <Screen edges={[]}>
        <ErrorState message={loadError ?? 'This expense could not be loaded.'} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]} footer={<Button label={editing ? 'Save changes' : 'Save expense'} icon="checkmark" onPress={save} loading={saving} fullWidth />}>
      <Stack.Screen options={{ title: editing ? 'Edit expense' : 'New expense' }} />
      {error ? <InlineError message={error} /> : null}

      <Section title="What was it for?" description={original ? `Recorded ${formatDateTime(original.createdAt)}` : undefined}>
        <ChipGroup options={EXPENSE_CATEGORIES} value={category} onChange={setCategory} />
        {errors.category ? (
          <AppText variant="caption" tone="danger">
            {errors.category}
          </AppText>
        ) : null}
      </Section>

      <Section title="Details">
        <TextField
          label="Amount"
          prefix="₦"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="5000"
          error={errors.amount}
          autoFocus={!editing}
        />
        <TextField
          label="Note (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Shop rent for October"
          maxLength={200}
          returnKeyType="done"
          onSubmitEditing={save}
        />
      </Section>

      {editing ? (
        <Section title="History">
          {history.loading ? (
            <Skeleton height={60} />
          ) : (history.data ?? []).length === 0 ? (
            <AppText tone="muted">No changes recorded yet.</AppText>
          ) : (
            (history.data ?? []).map((e, i, arr) => <ActivityItem key={e.id} event={e} actorName={actorName} last={i === arr.length - 1} />)
          )}
        </Section>
      ) : null}

      {editing ? <Button label="Delete expense" icon="trash-outline" variant="destructive" onPress={remove} loading={deleting} style={styles.delete} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  delete: { alignSelf: 'center' },
});
