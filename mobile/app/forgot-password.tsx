import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthLayout } from '../src/components/AuthLayout';
import { AppText } from '../src/components/AppText';
import { TextField } from '../src/components/TextField';
import { Button } from '../src/components/Button';
import { InlineError } from '../src/components/Feedback';
import { PasswordRules } from '../src/components/PasswordRules';
import { requestPasswordReset, resetPassword } from '../src/api/auth';
import { apiErrorMessage } from '../src/api/client';
import { isEmail } from '../src/utils/validate';
import { isStrongPassword } from '../src/utils/password';
import { spacing } from '../src/theme';

/**
 * Two steps on one screen, so the email is typed once: request a code, then
 * enter the code from the email with a new password.
 */
export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendCode() {
    setTouched(true);
    if (!isEmail(email)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await requestPasswordReset(email.trim());
      setNotice(res.message);
      setStep('code');
      setTouched(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const codeError = touched && !/^\d{6}$/.test(code) ? 'Enter the 6-digit code from the email' : undefined;
  const confirmError = touched && confirm !== password ? "The passwords don't match" : undefined;
  const ready = /^\d{6}$/.test(code) && isStrongPassword(password, email) && confirm === password;

  async function submitReset() {
    setTouched(true);
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      await resetPassword({ email: email.trim(), code, newPassword: password });
      router.replace({ pathname: '/login', params: { reset: '1', email: email.trim() } });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const backToLogin = (
    <Pressable onPress={() => router.replace('/login')} accessibilityRole="link" hitSlop={8} style={styles.link}>
      <AppText tone="muted">
        Remembered it? <AppText variant="bodyStrong" tone="primary">Back to sign in</AppText>
      </AppText>
    </Pressable>
  );

  if (step === 'email') {
    return (
      <AuthLayout heading="Reset your password" subheading="We'll email you a 6-digit code to set a new password." footer={backToLogin}>
        {error ? <InlineError message={error} /> : null}
        <TextField
          label="Email"
          leftIcon="mail-outline"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={sendCode}
          placeholder="you@business.com"
          error={touched && !isEmail(email) ? 'Enter a valid email address' : undefined}
        />
        <AppText variant="caption" tone="muted">
          Staff accounts: ask your business owner to reset your password from Team & branches.
        </AppText>
        <View style={styles.action}>
          <Button label="Send code" icon="mail-outline" onPress={sendCode} loading={loading} fullWidth />
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout heading="Enter your code" subheading={`Check ${email.trim()} for a 6-digit code.`} footer={backToLogin}>
      {error ? <InlineError message={error} /> : null}
      {notice && !error ? (
        <AppText variant="caption" tone="muted">
          {notice}
        </AppText>
      ) : null}
      <TextField
        label="6-digit code"
        leftIcon="keypad-outline"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
        placeholder="123456"
        error={codeError}
      />
      <TextField
        label="New password"
        leftIcon="lock-closed-outline"
        secureToggle
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
        placeholder="Choose a new password"
      />
      <PasswordRules password={password} email={email} showErrors={touched} />
      <TextField
        label="Confirm new password"
        leftIcon="lock-closed-outline"
        secureToggle
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        value={confirm}
        onChangeText={setConfirm}
        onSubmitEditing={submitReset}
        placeholder="Type it again"
        error={confirmError}
      />
      <View style={styles.action}>
        <Button label="Set new password" icon="checkmark" onPress={submitReset} loading={loading} fullWidth />
      </View>
      <Pressable onPress={() => { setStep('email'); setCode(''); setError(null); }} accessibilityRole="button" hitSlop={8} style={styles.link}>
        <AppText variant="caption" tone="primary">
          Didn't get a code? Send another
        </AppText>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: spacing.xs },
  link: { paddingVertical: spacing.sm, alignSelf: 'center' },
});
