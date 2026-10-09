import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/auth-store';
import { ServerWakeBanner } from '../src/components/ServerWakeBanner';
import { EventToasts } from '../src/components/Toast';
import { UpdateGate } from '../src/components/UpdateGate';
import { checkAppVersion, warmUpServer } from '../src/api/client';
import { colors, type } from '../src/theme';

// One header style for every pushed screen, so none of them looks like a different app.
const pushed = {
  headerShown: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: type.heading.fontSize, fontWeight: type.heading.fontWeight },
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: colors.background },
};

const PUBLIC_ROUTES = ['login', 'register', 'onboarding', 'forgot-password'];

/**
 * Sends any protected screen back to login when there is no session: on a
 * deep link without one, or the moment a 401 clears an expired session.
 */
function AuthGate() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hasHydrated);
  const segments = useSegments();
  const first = segments[0];
  useEffect(() => {
    if (!hydrated || token) return;
    if (first && !PUBLIC_ROUTES.includes(first)) router.replace('/login');
  }, [hydrated, token, first]);
  return null;
}

export default function RootLayout() {
  // Begin waking the hosted server while the user is still on the login screen.
  useEffect(() => {
    warmUpServer();
    // Lets the server retire or nudge old app versions; harmless when nothing is configured.
    void checkAppVersion();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sale/new" options={{ ...pushed, presentation: 'modal', title: 'New sale' }} />
          <Stack.Screen name="product/[id]" options={{ ...pushed, title: 'Product' }} />
          <Stack.Screen name="product/form" options={{ ...pushed, presentation: 'modal', title: 'Product' }} />
          <Stack.Screen name="customer/[id]" options={{ ...pushed, title: 'Customer' }} />
          <Stack.Screen name="customer/form" options={{ ...pushed, presentation: 'modal', title: 'Customer' }} />
          <Stack.Screen name="expense/form" options={{ ...pushed, presentation: 'modal', title: 'Expense' }} />
          <Stack.Screen name="activity" options={{ ...pushed, title: 'Activity' }} />
          <Stack.Screen name="team" options={{ ...pushed, title: 'Team & branches' }} />
          <Stack.Screen name="analytics" options={{ ...pushed, title: 'Analytics' }} />
          <Stack.Screen name="account" options={{ ...pushed, title: 'Account' }} />
        </Stack>
        <AuthGate />
        <ServerWakeBanner />
        <EventToasts />
        <UpdateGate />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
