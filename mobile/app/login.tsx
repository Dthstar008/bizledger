import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthLayout } from '../src/components/AuthLayout';
import { AppText } from '../src/components/AppText';
import { TextField } from '../src/components/TextField';
import { Button } from '../src/components/Button';
import { InlineError } from '../src/components/Feedback';
import { login } from '../src/api/auth';
import { apiErrorMessage } from '../src/api/client';
import { useAuthStore } from '../src/store/auth-store';
import { isEmail } from '../src/utils/validate';
import { spacing } from '../src/theme';

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const passwordRef = useRef<TextInput>(null);
  // After a password reset the email comes back with a confirmation flag.
  const params = useLocalSearchParams<{ reset?: string; email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = touched && !isEmail(email) ? 'Enter a valid email address' : undefined;
  const passwordError = touched && !password ? 'Enter your password' : undefined;

  async function handleLogin() {
    setTouched(true);
    if (!isEmail(email) || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await login({ email: email.trim(), password });
      setAuth({ token: res.accessToken, business: res.business, user: res.user });
      router.replace(res.user.role === 'staff' ? '/(tabs)/sales' : '/(tabs)');
    } catch (err) {
      // A 401 here means wrong credentials, not an expired session.
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 401 ? 'That email and password combination is not correct.' : apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Sign in to continue to your business."
      footer={
        <Pressable onPress={() => router.replace('/register')} accessibilityRole="link" hitSlop={8} style={styles.link}>
          <AppText tone="muted">
            New to BizLedger? <AppText variant="bodyStrong" tone="primary">Create an account</AppText>
          </AppText>
        </Pressable>
      }
    >
      {error ? <InlineError message={error} /> : null}
      {params.reset && !error ? (
        <AppText variant="caption" tone="primary">
          Your password has been changed. Sign in with your new password.
        </AppText>
      ) : null}
      <TextField
        label="Email"
        leftIcon="mail-outline"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={() => passwordRef.current?.focus()}
        placeholder="you@business.com"
        error={emailError}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        leftIcon="lock-closed-outline"
        secureToggle
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleLogin}
        placeholder="Your password"
        error={passwordError}
      />
      <Pressable
        onPress={() => router.push({ pathname: '/forgot-password', params: isEmail(email) ? { email: email.trim() } : {} })}
        accessibilityRole="link"
        hitSlop={8}
        style={styles.forgot}
      >
        <AppText variant="caption" tone="primary">
          Forgot password?
        </AppText>
      </Pressable>
      <View style={styles.action}>
        <Button label="Sign in" onPress={handleLogin} loading={loading} fullWidth />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: spacing.xs },
  link: { paddingVertical: spacing.sm },
  forgot: { alignSelf: 'flex-end', paddingVertical: spacing.xs },
});
