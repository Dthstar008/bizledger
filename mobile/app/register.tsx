import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthLayout } from '../src/components/AuthLayout';
import { AppText } from '../src/components/AppText';
import { TextField } from '../src/components/TextField';
import { Button } from '../src/components/Button';
import { InlineError } from '../src/components/Feedback';
import { legalUrls, registerBusiness } from '../src/api/auth';
import { PasswordRules } from '../src/components/PasswordRules';
import { isStrongPassword } from '../src/utils/password';
import { apiErrorMessage } from '../src/api/client';
import { useAuthStore } from '../src/store/auth-store';
import { isEmail } from '../src/utils/validate';
import { colors, radius, spacing, touch } from '../src/theme';

export default function RegisterScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmedAdult, setConfirmedAdult] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = {
    businessName: touched && !businessName.trim() ? 'Enter your business name' : undefined,
    email: touched && !isEmail(email) ? 'Enter a valid email address' : undefined,
    adult: touched && !confirmedAdult ? 'You must be 18 or older to create an account' : undefined,
    terms: touched && !acceptedTerms ? 'Please accept the Terms and Privacy Policy to continue' : undefined,
  };
  const valid = businessName.trim() && isEmail(email) && isStrongPassword(password, email) && confirmedAdult && acceptedTerms;

  async function handleRegister() {
    setTouched(true);
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await registerBusiness({
        businessName: businessName.trim(),
        ownerName: ownerName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim(),
        password,
        confirmedAdult,
        acceptedTerms,
      });
      setAuth({ token: res.accessToken, business: res.business, user: res.user });
      router.replace('/(tabs)');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      heading="Create your business account"
      subheading="Takes a minute. No accounting knowledge needed."
      footer={
        <Pressable onPress={() => router.replace('/login')} accessibilityRole="link" hitSlop={8} style={styles.link}>
          <AppText tone="muted">
            Already have an account? <AppText variant="bodyStrong" tone="primary">Sign in</AppText>
          </AppText>
        </Pressable>
      }
    >
      {error ? <InlineError message={error} /> : null}
      <TextField
        label="Business name"
        leftIcon="storefront-outline"
        value={businessName}
        onChangeText={setBusinessName}
        placeholder="Chidi Phone Accessories"
        autoCapitalize="words"
        error={errors.businessName}
      />
      <TextField
        label="Your name"
        leftIcon="person-outline"
        value={ownerName}
        onChangeText={setOwnerName}
        placeholder="Chidi Eze"
        autoCapitalize="words"
        autoComplete="name"
        helper="Used to greet you on your dashboard"
      />
      <TextField
        label="Phone (optional)"
        leftIcon="call-outline"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="0801 234 5678"
      />
      <TextField
        label="Email"
        leftIcon="mail-outline"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@business.com"
        error={errors.email}
      />
      <TextField
        label="Password"
        leftIcon="lock-closed-outline"
        secureToggle
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
        placeholder="Choose a password"
      />
      <PasswordRules password={password} email={email} showErrors={touched} />
      <Pressable
        style={styles.checkRow}
        onPress={() => setConfirmedAdult((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmedAdult }}
      >
        <View style={[styles.box, confirmedAdult && styles.boxChecked, !!errors.adult && styles.boxError]}>
          {confirmedAdult ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
        </View>
        <AppText style={styles.flex}>I confirm I am 18 years of age or older</AppText>
      </Pressable>
      {errors.adult ? (
        <AppText variant="caption" tone="danger">
          {errors.adult}
        </AppText>
      ) : null}
      <View style={styles.checkRow}>
        <Pressable
          onPress={() => setAcceptedTerms((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
          accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
          hitSlop={8}
        >
          <View style={[styles.box, acceptedTerms && styles.boxChecked, !!errors.terms && styles.boxError]}>
            {acceptedTerms ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
          </View>
        </Pressable>
        <AppText style={styles.flex}>
          I agree to the{' '}
          <AppText tone="primary" variant="bodyStrong" onPress={() => Linking.openURL(legalUrls.terms)} accessibilityRole="link">
            Terms of Service
          </AppText>{' '}
          and{' '}
          <AppText tone="primary" variant="bodyStrong" onPress={() => Linking.openURL(legalUrls.privacy)} accessibilityRole="link">
            Privacy Policy
          </AppText>
        </AppText>
      </View>
      {errors.terms ? (
        <AppText variant="caption" tone="danger">
          {errors.terms}
        </AppText>
      ) : null}
      <View style={styles.action}>
        <Button label="Create account" onPress={handleRegister} loading={loading} fullWidth />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, minHeight: touch.min },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm - 2,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  boxError: { borderColor: colors.danger },
  action: { marginTop: spacing.xs },
  link: { paddingVertical: spacing.sm },
});
