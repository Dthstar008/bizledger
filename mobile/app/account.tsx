import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { Card, Section } from '../src/components/Card';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { Badge } from '../src/components/Badge';
import { ListRow } from '../src/components/ListRow';
import { TextField } from '../src/components/TextField';
import { PasswordRules } from '../src/components/PasswordRules';
import { Avatar, InlineError, confirm } from '../src/components/Feedback';
import { changePassword, legalUrls } from '../src/api/auth';
import { apiErrorMessage } from '../src/api/client';
import { selectIsOwner, useAuthStore } from '../src/store/auth-store';
import { APP_VERSION } from '../src/store/app-status-store';
import { isStrongPassword } from '../src/utils/password';
import { colors, spacing } from '../src/theme';

function ChangePasswordForm({ email, onDone }: { email: string; onDone: () => void }) {
  const setToken = useAuthStore((s) => s.setToken);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = current.length > 0 && isStrongPassword(next, email) && confirmValue === next;

  async function save() {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const res = await changePassword({ currentPassword: current, newPassword: next });
      // The server signs out every other device and gives this one a new session.
      setToken(res.accessToken);
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
        label="Current password"
        secureToggle
        autoComplete="current-password"
        textContentType="password"
        value={current}
        onChangeText={setCurrent}
        error={touched && !current ? 'Enter your current password' : undefined}
      />
      <TextField label="New password" secureToggle autoComplete="new-password" textContentType="newPassword" value={next} onChangeText={setNext} />
      <PasswordRules password={next} email={email} showErrors={touched} />
      <TextField
        label="Confirm new password"
        secureToggle
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        value={confirmValue}
        onChangeText={setConfirmValue}
        onSubmitEditing={save}
        error={touched && confirmValue !== next ? "The passwords don't match" : undefined}
      />
      <AppText variant="caption" tone="muted">
        You'll stay signed in on this phone. Any other phone using your account will be signed out.
      </AppText>
      <View style={styles.row}>
        <Button label="Cancel" variant="secondary" onPress={onDone} style={styles.flexButton} />
        <Button label="Save" icon="checkmark" onPress={save} loading={saving} style={styles.flexButton} />
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const user = useAuthStore((s) => s.user);
  const business = useAuthStore((s) => s.business);
  const isOwner = useAuthStore(selectIsOwner);
  const logout = useAuthStore((s) => s.logout);
  const [changing, setChanging] = useState(false);
  const [changed, setChanged] = useState(false);

  async function signOut() {
    const ok = await confirm({
      title: 'Log out?',
      message: "You'll need your email and password to sign back in.",
      confirmLabel: 'Log out',
      destructive: true,
    });
    if (!ok) return;
    logout();
    router.replace('/login');
  }

  const displayName = user?.name || user?.email || 'You';

  return (
    <Screen edges={[]}>
      <Card style={styles.identity}>
        <Avatar name={displayName} size={56} />
        <View style={styles.flex}>
          <AppText variant="heading">{displayName}</AppText>
          {user?.email ? (
            <AppText variant="caption" tone="muted">
              {user.email}
            </AppText>
          ) : null}
          <View style={styles.badges}>
            <Badge label={isOwner ? 'Owner' : 'Staff'} tone={isOwner ? 'success' : 'neutral'} />
            {business?.name ? <Badge label={business.name} /> : null}
          </View>
        </View>
      </Card>

      <Section title="Security">
        {changing ? (
          <ChangePasswordForm
            email={user?.email ?? ''}
            onDone={() => {
              setChanging(false);
              setChanged(true);
            }}
          />
        ) : (
          <>
            {changed ? (
              <AppText variant="caption" tone="primary">
                Your password has been changed.
              </AppText>
            ) : null}
            <ListRow title="Change password" subtitle="Signs out your account on other phones" onPress={() => { setChanged(false); setChanging(true); }} last />
          </>
        )}
      </Section>

      <Section title="Legal">
        <ListRow title="Privacy Policy" subtitle="What we collect and how it is used" onPress={() => Linking.openURL(legalUrls.privacy)} />
        <ListRow title="Terms of Service" subtitle="The agreement for using BizLedger" onPress={() => Linking.openURL(legalUrls.terms)} last />
      </Section>

      <AppText variant="caption" tone="muted" align="center">
        BizLedger version {APP_VERSION}
      </AppText>

      <Button label="Log out" icon="log-out-outline" variant="destructive" onPress={signOut} style={styles.logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xxs },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  flexButton: { flex: 1, alignSelf: 'auto' },
  logout: { alignSelf: 'center', borderColor: colors.danger },
});
