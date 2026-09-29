import { apiClient } from './client';
import { LedgerEvent, LedgerEventType } from './types';

export interface LedgerQuery {
  entity?: 'product' | 'customer' | 'expense' | 'sale';
  entityId?: string;
  types?: LedgerEventType[];
  limit?: number;
  /** Cursor: pass the createdAt of the last event from the previous page. */
  before?: string;
}

/** Owner only: the business's event history, newest first. */
export function listLedgerEvents(q: LedgerQuery = {}) {
  return apiClient
    .get<LedgerEvent[]>('/ledger/events', {
      params: {
        entity: q.entity,
        entityId: q.entityId,
        types: q.types?.join(','),
        limit: q.limit,
        before: q.before,
      },
    })
    .then((r) => r.data);
}
