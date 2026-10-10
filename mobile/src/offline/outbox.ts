import axios from 'axios';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiErrorMessage, isNetworkError } from '../api/client';
import { createSale, SaleInput } from '../api/sales';
import { createExpense, ExpenseInput } from '../api/expenses';
import { Expense, PaymentMethod, Sale } from '../api/types';
import { publish } from '../events/bus';
import { selectIsOwner, useAuthStore } from '../store/auth-store';
import { uuidv4 } from '../utils/uuid';
import { isOffline } from './connection';

/**
 * Records made without a connection wait here, on the phone, until they can
 * be sent. Each carries a clientRef (its id) generated when it was made, so
 * sending one twice can never create a duplicate on the server, and the time
 * it actually happened, so it lands on the right day in reports.
 *
 * Only sales and expenses are queued. Things that depend on the server's
 * current numbers (debt repayments, stock edits, new products) need a
 * connection, so the person sees the real result straight away.
 */

/** What the phone shows for a queued sale before the server has it. */
export interface QueuedSaleDisplay {
  lines: { productId: string; productName: string; quantity: number; unitPrice: number }[];
  total: number;
  amountPaid: number;
  customerName?: string;
}

interface Base {
  /** Also the clientRef the server dedupes on. */
  id: string;
  occurredAt: string;
  businessId: string;
  userId: string;
  /** The branch it was recorded in (owners can switch branch before it syncs). */
  branchId: string | null;
  status: 'pending' | 'failed';
  /** Why the server refused it, in words a person can act on. */
  error?: string;
  attempts: number;
}

export type OutboxItem =
  | (Base & { kind: 'sale'; payload: SaleInput; display: QueuedSaleDisplay })
  | (Base & { kind: 'expense'; payload: ExpenseInput });

interface OutboxState {
  items: OutboxItem[];
  /** A sync pass is running (not persisted). */
  syncing: boolean;
  hasHydrated: boolean;
}

export const useOutbox = create<OutboxState>()(
  persist(() => ({ items: [], syncing: false, hasHydrated: false }) as OutboxState, {
    name: 'bizledger-outbox',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (s) => ({ items: s.items }),
    onRehydrateStorage: () => () => {
      useOutbox.setState({ hasHydrated: true });
      void syncOutbox();
    },
  }),
);

const update = (id: string, patch: Partial<Base>) =>
  useOutbox.setState((s) => ({ items: s.items.map((i) => (i.id === id ? ({ ...i, ...patch } as OutboxItem) : i)) }));
const remove = (id: string) => useOutbox.setState((s) => ({ items: s.items.filter((i) => i.id !== id) }));

/** The signed-in person's queued records (another account's stay untouched on the phone). */
export function selectMine(items: OutboxItem[]): OutboxItem[] {
  const { business, user } = useAuthStore.getState();
  if (!business || !user) return [];
  return items.filter((i) => i.businessId === business.id && i.userId === user.id);
}

export function useMyOutbox(): OutboxItem[] {
  const items = useOutbox((s) => s.items);
  const businessId = useAuthStore((s) => s.business?.id);
  const userId = useAuthStore((s) => s.user?.id);
  return items.filter((i) => i.businessId === businessId && i.userId === userId);
}

/** Units sold in queued sales, per product, so stock shown on this phone already accounts for them. */
export function pendingStock(items: OutboxItem[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const i of items) {
    if (i.kind !== 'sale') continue;
    for (const l of i.payload.items) out.set(l.productId, (out.get(l.productId) ?? 0) + l.quantity);
  }
  return out;
}

function newItemBase(): Omit<Base, 'id'> | null {
  const s = useAuthStore.getState();
  if (!s.business || !s.user) return null;
  return {
    occurredAt: new Date().toISOString(),
    businessId: s.business.id,
    userId: s.user.id,
    branchId: selectIsOwner(s) ? s.activeBranchId : null,
    status: 'pending',
    attempts: 0,
  };
}

/** A queued sale shaped like a server Sale, for the receipt and lists. */
export function queuedSaleAsSale(item: Extract<OutboxItem, { kind: 'sale' }>): Sale {
  const { display, payload } = item;
  const outstanding = Math.max(0, display.total - display.amountPaid);
  return {
    id: item.id,
    items: display.lines.map((l, idx) => ({
      id: `${item.id}-${idx}`,
      productId: l.productId,
      productName: l.productName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.unitPrice * l.quantity,
    })) as Sale['items'],
    paymentMethod: payload.paymentMethod,
    status: 'confirmed',
    paymentStatus: outstanding <= 0 ? 'paid' : outstanding >= display.total ? 'credit' : 'partially_paid',
    totalAmount: display.total,
    amountPaid: display.amountPaid,
    creditAmount: outstanding,
    outstandingBalance: outstanding,
    verified: payload.paymentMethod === 'cash',
    createdAt: item.occurredAt,
    customer: display.customerName && payload.customerId ? { id: payload.customerId, name: display.customerName } : null,
  };
}

export type RecordResult<T> = { status: 'saved'; record: T } | { status: 'queued'; item: OutboxItem };

async function sendOrQueue<T>(item: OutboxItem, send: () => Promise<T>): Promise<RecordResult<T>> {
  if (!isOffline()) {
    try {
      return { status: 'saved', record: await send() };
    } catch (err) {
      // Refused by the server (a real problem the person must see), not a lost connection.
      if (!isNetworkError(err)) throw err;
    }
  }
  // No connection, or it dropped mid-request. The request may even have
  // reached the server; the clientRef makes sending it again harmless.
  useOutbox.setState((s) => ({ items: [...s.items, item] }));
  publish({ type: 'outbox.queued', kind: item.kind });
  return { status: 'queued', item };
}

/** Records a sale now, or saves it on the phone to send when the connection returns. */
export function recordSale(payload: SaleInput, display: QueuedSaleDisplay): Promise<RecordResult<Sale>> {
  const base = newItemBase();
  if (!base) return Promise.reject(new Error('Not signed in'));
  const item: OutboxItem = { ...base, id: uuidv4(), kind: 'sale', payload, display };
  return sendOrQueue(item, () => createSale({ ...payload, clientRef: item.id }));
}

/** Records an expense now, or saves it on the phone to send when the connection returns. */
export function recordExpense(payload: ExpenseInput): Promise<RecordResult<Expense>> {
  const base = newItemBase();
  if (!base) return Promise.reject(new Error('Not signed in'));
  const item: OutboxItem = { ...base, id: uuidv4(), kind: 'expense', payload };
  return sendOrQueue(item, () => createExpense({ ...payload, clientRef: item.id }));
}

function send(item: OutboxItem) {
  const sync = { clientRef: item.id, occurredAt: item.occurredAt };
  const config = { branchOverride: item.branchId };
  return item.kind === 'sale' ? createSale({ ...item.payload, ...sync }, config) : createExpense({ ...item.payload, ...sync }, config);
}

/** Server errors worth trying again later rather than asking the person to act. */
function isTemporary(err: unknown): boolean {
  if (isNetworkError(err)) return true;
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  return status === undefined || status === 401 || status === 408 || status === 426 || status === 429 || status >= 500;
}

let running: Promise<void> | null = null;

/**
 * Sends the signed-in person's queued records, oldest first. Stops at the
 * first connection problem (the rest wait for the next attempt). A record the
 * server refuses (e.g. not enough stock left) is marked failed with the
 * reason and skipped, so it can't block everything behind it.
 */
export function syncOutbox(): Promise<void> {
  if (running) return running;
  running = (async () => {
    const state = useOutbox.getState();
    if (!state.hasHydrated || !useAuthStore.getState().token) return;
    const queue = selectMine(state.items).filter((i) => i.status === 'pending');
    if (queue.length === 0) return;
    useOutbox.setState({ syncing: true });
    let synced = 0;
    try {
      for (const item of queue) {
        try {
          const saved = await send(item);
          remove(item.id);
          synced++;
          if (item.kind === 'sale') publish({ type: 'sale.completed', sale: saved as Sale, fromSync: true });
          else publish({ type: 'expense.changed', expenseId: (saved as Expense).id, change: 'created', amount: item.payload.amount, fromSync: true });
        } catch (err) {
          if (isTemporary(err)) {
            update(item.id, { attempts: item.attempts + 1 });
            break;
          }
          update(item.id, { status: 'failed', error: apiErrorMessage(err), attempts: item.attempts + 1 });
        }
      }
    } finally {
      useOutbox.setState({ syncing: false });
      if (synced > 0) publish({ type: 'outbox.synced', count: synced });
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Try a refused record again (e.g. after fixing the stock count). */
export function retryOutboxItem(id: string) {
  update(id, { status: 'pending', error: undefined });
  return syncOutbox();
}

export function discardOutboxItem(id: string) {
  remove(id);
}

/** On log out: the signed-in person's unsent records are dropped (after they've confirmed). */
export function discardMyOutbox() {
  const mine = new Set(selectMine(useOutbox.getState().items).map((i) => i.id));
  useOutbox.setState((s) => ({ items: s.items.filter((i) => !mine.has(i.id)) }));
}

export const METHOD_LABEL: Record<PaymentMethod, string> = { cash: 'Cash', transfer: 'Transfer', pos: 'POS', credit: 'Credit' };
