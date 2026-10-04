import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Card';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { IconButton } from '../src/components/IconButton';
import { ChipGroup } from '../src/components/Chip';
import { TextField } from '../src/components/TextField';
import { ListRow } from '../src/components/ListRow';
import { Badge } from '../src/components/Badge';
import { Avatar, ErrorState, InlineError, SkeletonList, confirm } from '../src/components/Feedback';
import { apiErrorMessage } from '../src/api/client';
import { createEmployee, listEmployees, removeEmployee } from '../src/api/employees';
import { createBranch, listBranches } from '../src/api/branches';
import { Branch, Employee } from '../src/api/types';
import { publish } from '../src/events/bus';
import { useResource } from '../src/hooks/useResource';
import { useAuthStore } from '../src/store/auth-store';
import { isEmail } from '../src/utils/validate';
import { colors, radius, spacing } from '../src/theme';

function StaffForm({ branches, onDone }: { branches: Branch[]; onDone: () => void }) {
  const defaultBranch = branches.find((b) => b.isDefault)?.id ?? branches[0]?.id;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState<string | undefined>(defaultBranch);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = {
    name: touched && !name.trim() ? 'Enter their name' : undefined,
    email: touched && !isEmail(email) ? 'Enter a valid email address' : undefined,
    password: touched && password.length < 6 ? 'Use at least 6 characters' : undefined,
  };
  const valid = !!name.trim() && isEmail(email) && password.length >= 6;

  async function save() {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await createEmployee({ name: name.trim(), email: email.trim(), password, branchId });
      publish({ type: 'team.changed' });
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <AppText variant="caption" tone="muted">
        Staff can record sales and manage customers, but can't see profit, costs or expenses.
      </AppText>
      {error ? <InlineError message={error} /> : null}
      <TextField label="Name" value={name} onChangeText={setName} placeholder="Ada Okoye" autoCapitalize="words" error={errors.name} />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="ada@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        error={errors.email}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        secureToggle
        autoCapitalize="none"
        helper="At least 6 characters. Share it with them privately."
        error={errors.password}
      />
      {branches.length > 1 ? (
        <>
          <AppText variant="label" tone="muted">
            Works at
          </AppText>
          <ChipGroup options={branches.map((b) => ({ value: b.id, label: b.name }))} value={branchId} onChange={setBranchId} />
        </>
      ) : null}
      <View style={styles.row}>
        <Button label="Cancel" variant="secondary" onPress={onDone} style={styles.flexButton} />
        <Button label="Create account" icon="checkmark" onPress={save} loading={saving} style={styles.flexButton} />
      </View>
    </View>
  );
}

function BranchForm({ onDone }: { onDone: () => void }) {
  const setBranches = useAuthStore((s) => s.setBranches);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setTouched(true);
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createBranch({ name: name.trim(), address: address.trim() || undefined });
      setBranches(await listBranches());
      publish({ type: 'team.changed' });
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      {error ? <InlineError message={error} /> : null}
      <TextField
        label="Branch name"
        value={name}
        onChangeText={setName}
        placeholder="Lekki branch"
        autoCapitalize="words"
        error={touched && !name.trim() ? 'Enter a name for the branch' : undefined}
      />
      <TextField label="Address (optional)" value={address} onChangeText={setAddress} placeholder="12 Admiralty Way, Lekki" />
      <View style={styles.row}>
        <Button label="Cancel" variant="secondary" onPress={onDone} style={styles.flexButton} />
        <Button label="Add branch" icon="checkmark" onPress={save} loading={saving} style={styles.flexButton} />
      </View>
    </View>
  );
}

export default function TeamScreen() {
  const branches = useAuthStore((s) => s.branches);
  const setBranches = useAuthStore((s) => s.setBranches);
  const [addingStaff, setAddingStaff] = useState(false);
  const [addingBranch, setAddingBranch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const team = useResource(async () => {
    const [employees, brs] = await Promise.all([listEmployees(), listBranches()]);
    setBranches(brs);
    return employees;
  }, ['team.changed']);

  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? 'No branch';

  async function remove(e: Employee) {
    const who = e.name ?? e.email;
    const ok = await confirm({
      title: `Remove ${who}?`,
      message: 'They will lose access to this business immediately. Sales they recorded stay in your records.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    try {
      await removeEmployee(e.id);
      publish({ type: 'team.changed' });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (team.loading) {
    return (
      <Screen edges={[]}>
        <SkeletonList rows={5} />
      </Screen>
    );
  }
  if (!team.data) {
    return (
      <Screen edges={[]}>
        <ErrorState message={team.error ?? 'Your team could not be loaded.'} onRetry={team.retry} />
      </Screen>
    );
  }

  const employees = team.data;
  const staffCount = employees.filter((e) => e.role === 'staff').length;

  return (
    <Screen edges={[]} refreshing={team.refreshing} onRefresh={team.reload}>
      {error ? <InlineError message={error} /> : null}
      {team.error ? <InlineError message={team.error} onRetry={team.reload} /> : null}

      <Section
        title="Team"
        description={staffCount === 0 ? 'Give staff their own login to record sales' : `${staffCount} staff member${staffCount === 1 ? '' : 's'}`}
        action={!addingStaff ? <Button label="Add staff" icon="person-add-outline" size="sm" variant="ghost" onPress={() => setAddingStaff(true)} /> : null}
      >
        {addingStaff ? <StaffForm branches={branches} onDone={() => setAddingStaff(false)} /> : null}
        {employees.map((e, i) => (
          <ListRow
            key={e.id}
            title={e.name ?? e.email}
            subtitle={e.role === 'owner' ? e.email : `${e.email} · ${branchName(e.branchId)}`}
            leading={<Avatar name={e.name ?? e.email} />}
            trailing={
              e.role === 'owner' ? (
                <Badge label="Owner" tone="success" />
              ) : (
                <IconButton icon="trash-outline" tone="danger" accessibilityLabel={`Remove ${e.name ?? e.email}`} onPress={() => remove(e)} />
              )
            }
            last={i === employees.length - 1}
          />
        ))}
      </Section>

      <Section
        title="Branches"
        description="Sales, stock and expenses can be tracked per branch"
        action={!addingBranch ? <Button label="Add branch" icon="add" size="sm" variant="ghost" onPress={() => setAddingBranch(true)} /> : null}
      >
        {addingBranch ? <BranchForm onDone={() => setAddingBranch(false)} /> : null}
        {branches.map((b, i) => (
          <ListRow
            key={b.id}
            title={b.name}
            subtitle={b.address || undefined}
            leading={
              <View style={styles.icon}>
                <Ionicons name="storefront-outline" size={20} color={colors.primary} />
              </View>
            }
            trailing={b.isDefault ? <Badge label="Main" /> : null}
            last={i === branches.length - 1}
          />
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flexButton: { flex: 1, alignSelf: 'auto' },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
});
