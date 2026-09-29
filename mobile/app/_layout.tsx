import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ServerWakeBanner } from '../src/components/ServerWakeBanner';
import { warmUpServer } from '../src/api/client';

export default function RootLayout() {
  // Begin waking the hosted server while the user is still on the login screen.
  useEffect(() => {
    warmUpServer();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sale/new" options={{ presentation: 'modal', headerShown: true, title: 'New Sale' }} />
          <Stack.Screen
            name="customer/[id]"
            options={{ headerShown: true, title: 'Customer' }}
          />
          <Stack.Screen name="team" options={{ headerShown: true, title: 'Team & branches' }} />
          <Stack.Screen name="analytics" options={{ headerShown: true, title: 'Analytics' }} />
        </Stack>
        <ServerWakeBanner />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
