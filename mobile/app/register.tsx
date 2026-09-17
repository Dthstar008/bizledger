import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { TextField } from '../src/components/TextField';
import { Button } from '../src/components/Button';
import { registerBusiness } from '../src/api/auth';
import { apiErrorMessage } from '../src/api/client';
import { useAuthStore } from '../src/store/auth-store';
import { colors, spacing } from '../src/theme';

export default function RegisterScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      const res = await registerBusiness({
        businessName: businessName.trim(),
        ownerName: ownerName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim(),
        password,
      });
      setAuth({ token: res.accessToken, business: res.business, user: res.user });
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Could not create account', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = businessName.trim().length > 0 && email.trim().length > 0 && password.length >= 6;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Set up your business</Text>
        <Text style={styles.subtitle}>Takes a minute. No accounting knowledge needed.</Text>
      </View>

      <TextField label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="Chidi Phone Accessories" />
      <TextField label="Your name" value={ownerName} onChangeText={setOwnerName} placeholder="Chidi Eze" />
      <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="080..." />
      <TextField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@business.com" />
      <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 6 characters" />

      <Button label="Create account" onPress={handleRegister} loading={loading} disabled={!canSubmit} />

      <Link href="/login" style={styles.link}>
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
      </Link>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    fontSize: 24,
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
