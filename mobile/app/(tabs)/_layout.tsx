import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { selectIsOwner, useAuthStore } from '../../src/store/auth-store';
import { listBranches } from '../../src/api/branches';

type IoniconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused }: { name: IoniconName; focused: boolean }) {
  return <Ionicons name={name} size={22} color={focused ? colors.primary : colors.textMuted} />;
}

export default function TabsLayout() {
  const isOwner = useAuthStore(selectIsOwner);
  const token = useAuthStore((s) => s.token);
  const setBranches = useAuthStore((s) => s.setBranches);

  // Branch list feeds the owner's switcher and the staff branch label.
  useEffect(() => {
    if (!token) return;
    listBranches()
      .then(setBranches)
      .catch(() => {
        // Non-fatal: the app still works against the default branch.
      });
  }, [token, setBranches]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          href: isOwner ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'receipt' : 'receipt-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'cube' : 'cube-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          href: isOwner ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'cash' : 'cash-outline'} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
