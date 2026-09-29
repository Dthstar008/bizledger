import { StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { selectIsOwner, useAuthStore } from '../src/store/auth-store';
import { usePrefs } from '../src/store/prefs-store';
import { BrandMark } from '../src/components/Brand';
import { colors } from '../src/theme';

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const isOwner = useAuthStore(selectIsOwner);
  const authReady = useAuthStore((s) => s.hasHydrated);
  const prefsReady = usePrefs((s) => s.hasHydrated);
  const hasSeenOnboarding = usePrefs((s) => s.hasSeenOnboarding);

  if (!authReady || !prefsReady) {
    return (
      <View style={styles.splash} accessibilityLabel="Loading BizLedger">
        <BrandMark size={64} />
      </View>
    );
  }

  if (!token) return <Redirect href={hasSeenOnboarding ? '/login' : '/onboarding'} />;
  // Staff have no dashboard, so they land on Sales.
  return <Redirect href={isOwner ? '/(tabs)' : '/(tabs)/sales'} />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
