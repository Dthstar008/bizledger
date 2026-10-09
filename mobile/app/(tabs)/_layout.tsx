import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, radius } from '../../src/theme';
import { useTheme } from '../../src/theming';
import { selectIsOwner, useAuthStore } from '../../src/store/auth-store';
import { listBranches } from '../../src/api/branches';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Filled icon on a soft green pill for the active tab; outline icon otherwise. */
function TabIcon({ name, focused }: { name: IoniconName; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: 56, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.primaryMuted : 'transparent' }}>
      <Ionicons name={name} size={22} color={focused ? colors.primary : colors.textMuted} />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
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
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: 64 },
        tabBarItemStyle: { paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12, marginTop: 2 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
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
          title: 'Stock',
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
