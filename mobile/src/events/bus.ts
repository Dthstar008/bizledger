import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Sale } from '../api/types';

/**
 * Domain events the app reacts to. Mutations publish one after the server has
 * confirmed the change (the server has already written the matching ledger
 * event); screens subscribe to the events that affect what they show instead
 * of refetching everything on every visit.
 */
export type AppEvent =
  | { type: 'sale.completed'; sale: Sale }
  | { type: 'payment.received'; customerId: string; amount: number }
  | { type: 'stock.adjusted'; productId: string; delta: number }
  | { type: 'product.changed'; productId: string; change: 'created' | 'updated' | 'deleted' | 'photo' }
  | { type: 'customer.changed'; customerId: string; change: 'created' | 'updated' | 'deleted' }
  | { type: 'expense.changed'; expenseId: string; change: 'created' | 'updated' | 'deleted'; amount?: number }
  | { type: 'team.changed' }
  | { type: 'branch.selected'; branchId: string | null };

export type AppEventType = AppEvent['type'];
type Handler = (event: AppEvent) => void;

const handlers = new Set<{ types: ReadonlySet<AppEventType>; fn: Handler }>();

export function publish(event: AppEvent) {
  for (const h of [...handlers]) {
    if (h.types.has(event.type)) h.fn(event);
  }
}

export function subscribe(types: AppEventType[], fn: Handler): () => void {
  const entry = { types: new Set(types), fn };
  handlers.add(entry);
  return () => handlers.delete(entry);
}

/** Subscribe for the component's lifetime. */
export function useEvent(types: AppEventType[], fn: Handler) {
  const ref = useRef(fn);
  ref.current = fn;
  const key = types.join('|');
  useEffect(() => subscribe(key.split('|') as AppEventType[], (e) => ref.current(e)), [key]);
}

/**
 * Keeps a screen's data current from events: reloads right away if the
 * screen is visible, or once on its next focus if the event happened while
 * it was in the background. No blanket refetch on every focus.
 */
export function useRefreshOn(types: AppEventType[], reload: () => void) {
  const focused = useRef(false);
  const stale = useRef(false);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEvent(types, () => {
    if (focused.current) reloadRef.current();
    else stale.current = true;
  });

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (stale.current) {
        stale.current = false;
        reloadRef.current();
      }
      return () => {
        focused.current = false;
      };
    }, []),
  );
}
