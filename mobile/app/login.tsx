import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { TextField } from '../src/components/TextField';
import { Button } from '../src/components/Button';
import { login } from '../src/api/auth';
import { apiErrorMessage } from '../src/api/client';
import { useAuthStore } from '../src/store/auth-store';
import { colors, spacing } from '../src/theme';

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password });
      setAuth({ token: res.accessToken, business: res.business, user: res.user });
      router.replace(res.user.role === 'staff' ? '/(tabs)/sales' : '/(tabs)');
    } catch (err) {
      Alert.alert('Could not sign in', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BizLedger</Text>
        <Text style={styles.subtitle}>Run your entire business from your phone.</Text>
      </View>

      <TextField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@business.com"
      />
      <TextField
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
      />

      <Button label="Sign in" onPress={handleLogin} loading={loading} disabled={!email || !password} />

      <Link href="/register" style={styles.link}>
        <Text style={styles.linkText}>New business? Create an account</Text>
      </Link>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
  },
  link: {
    marginTop: spacing.sm,
    alignSelf: 'center',
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
});
