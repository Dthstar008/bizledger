import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { Button } from '../src/components/Button';
import { TextField } from '../src/components/TextField';
import { apiErrorMessage } from '../src/api/client';
import { createEmployee, listEmployees, removeEmployee } from '../src/api/employees';
import { createBranch, listBranches } from '../src/api/branches';
import { Employee } from '../src/api/types';
import { useAuthStore } from '../src/store/auth-store';
import { colors, radius, spacing } from '../src/theme';
import { useFocusLoad } from '../src/hooks/useFocusLoad';

export default function TeamScreen() {
  const branches = useAuthStore((s) => s.branches);
  const setBranches = useAuthStore((s) => s.setBranches);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [addingBranch, setAddingBranch] = useState(false);

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffBranchId, setStaffBranchId] = useState<string | undefined>(undefined);
  const [addingStaff, setAddingStaff] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, brs] = await Promise.all([listEmployees(), listBranches()]);
      setEmployees(emps);
      setBranches(brs);
    } catch (err) {
      Alert.alert('Could not load team', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [setBranches]);

  useFocusLoad(load);

  const branchName_ = (id: string | null) => branches.find((b) => b.id === id)?.name ?? 'No branch';

  async function handleAddBranch() {
    setAddingBranch(true);
    try {
      await createBranch({ name: branchName.trim(), address: branchAddress.trim() || undefined });
      setBranchName('');
      setBranchAddress('');
      await load();
    } catch (err) {
      Alert.alert('Could not add branch', apiErrorMessage(err));
    } finally {
      setAddingBranch(false);
    }
  }

  async function handleAddStaff() {
    setAddingStaff(true);
    try {
      await createEmployee({
        name: staffName.trim(),
        email: staffEmail.trim(),
        password: staffPassword,
        branchId: staffBranchId,
      });
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setShowStaffForm(false);
      await load();
    } catch (err) {
      Alert.alert('Could not add staff', apiErrorMessage(err));
    } finally {
      setAddingStaff(false);
    }
  }

  function confirmRemove(e: Employee) {
    Alert.alert('Remove staff member?', `${e.name ?? e.email} will lose access immediately.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeEmployee(e.id);
            await load();
          } catch (err) {
            Alert.alert('Could not remove', apiErrorMessage(err));
          }
        },
      },
    ]);
  }

  const canAddStaff = staffName.trim() && staffEmail.trim() && staffPassword.length >= 6;

  return (
    <ScreenContainer refreshing={loading} onRefresh={load}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Branches</Text>
        {branches.map((b) => (
          <View key={b.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{b.name}</Text>
              {b.address ? <Text style={styles.muted}>{b.address}</Text> : null}
            </View>
            {b.isDefault ? <Text style={styles.badge}>Default</Text> : null}
          </View>
        ))}
        <TextField label="New branch name" value={branchName} onChangeText={setBranchName} placeholder="Lekki Branch" />
        <TextField label="Address (optional)" value={branchAddress} onChangeText={setBranchAddress} />
        <Button label="Add branch" onPress={handleAddBranch} loading={addingBranch} disabled={!branchName.trim()} />
      </View>

      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Team</Text>
          <Button
            label={showStaffForm ? 'Cancel' : 'Add staff'}
            variant="secondary"
            onPress={() => setShowStaffForm((v) => !v)}
          />
        </View>

        {showStaffForm && (
          <View style={styles.form}>
            <Text style={styles.muted}>
              Staff can record sales and manage customers, but can't see profit, costs or expenses.
            </Text>
            <TextField label="Name" value={staffName} onChangeText={setStaffName} placeholder="Ada Okoye" />
            <TextField
              label="Email"
              value={staffEmail}
              onChangeText={setStaffEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextField
              label="Password (min 6 characters)"
              value={staffPassword}
              onChangeText={setStaffPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.label}>Works at</Text>
            <View style={styles.chipRow}>
              {branches.map((b) => {
                const selected = (staffBranchId ?? branches.find((x) => x.isDefault)?.id) === b.id;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => setStaffBranchId(b.id)}
                    style={[styles.chip, selected && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{b.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button label="Create staff account" onPress={handleAddStaff} loading={addingStaff} disabled={!canAddStaff} />
          </View>
        )}

        {employees.map((e) => (
          <View key={e.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{e.name ?? e.email}</Text>
              <Text style={styles.muted}>
                {e.email} · {e.role === 'owner' ? 'Owner' : branchName_(e.branchId)}
              </Text>
            </View>
            {e.role === 'staff' ? (
              <Pressable onPress={() => confirmRemove(e)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            ) : (
              <Text style={styles.badge}>Owner</Text>
            )}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowTitle: { color: colors.text, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 13 },
  label: { color: colors.textMuted, fontSize: 14 },
  badge: {
    color: colors.primary,
    backgroundColor: colors.primaryMuted,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  remove: { color: colors.danger, fontWeight: '600' },
  form: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
});
