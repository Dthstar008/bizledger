import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { selectIsOwner, useAuthStore } from '../src/store/auth-store';
import { colors } from '../src/theme';

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const isOwner = useAuthStore(selectIsOwner);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!token) return <Redirect href="/login" />;
  // Staff have no dashboard, so they land on Sales.
  return <Redirect href={isOwner ? '/(tabs)' : '/(tabs)/sales'} />;
}
