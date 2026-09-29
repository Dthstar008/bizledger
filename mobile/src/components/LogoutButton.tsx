import { router } from 'expo-router';
import { IconButton } from './IconButton';
import { confirm } from './Feedback';
import { useAuthStore } from '../store/auth-store';

/** Subtle header control: logging out is discoverable but never competes with business actions. */
export function LogoutButton() {
  const logout = useAuthStore((s) => s.logout);
  const onPress = async () => {
    const ok = await confirm({
      title: 'Log out?',
      message: "You'll need your email and password to sign back in.",
      confirmLabel: 'Log out',
      destructive: true,
    });
    if (!ok) return;
    logout();
    router.replace('/login');
  };
  return <IconButton icon="log-out-outline" onPress={onPress} accessibilityLabel="Log out" tone="muted" />;
}
