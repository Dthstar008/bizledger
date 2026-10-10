import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../store/auth-store';
import { onBackOnline, startConnectionMonitor } from './connection';
import { selectMine, syncOutbox, useOutbox } from './outbox';

/** How often to try again while records are waiting and nothing else has triggered a sync. */
const RETRY_EVERY_MS = 30_000;

/**
 * Runs once at the app root: watches the connection and sends records saved
 * offline when signed in, when the connection returns, when the app comes
 * back to the foreground, and every 30 seconds while any are waiting.
 */
export function useOfflineSync() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => startConnectionMonitor(), []);

  useEffect(() => {
    if (!token) return;
    void syncOutbox();
    const off = onBackOnline(() => void syncOutbox());
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncOutbox();
    });
    const timer = setInterval(() => {
      if (selectMine(useOutbox.getState().items).some((i) => i.status === 'pending')) void syncOutbox();
    }, RETRY_EVERY_MS);
    return () => {
      off();
      sub.remove();
      clearInterval(timer);
    };
  }, [token]);
}
