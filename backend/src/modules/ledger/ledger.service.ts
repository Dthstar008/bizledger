import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LedgerEvent, LedgerEventType } from '../../entities';
import { LedgerEntity } from './dto/ledger-query.dto';

export interface LedgerListOptions {
  limit?: number;
  entity?: LedgerEntity;
  entityId?: string;
  types?: LedgerEventType[];
  before?: Date;
}

// Which metadata key identifies each kind of entity on an event.
const ENTITY_KEY: Record<LedgerEntity, string> = {
  product: 'productId',
  customer: 'customerId',
  expense: 'expenseId',
  sale: 'saleId',
};

@Injectable()
export class LedgerService {
  constructor(@InjectRepository(LedgerEvent) private readonly events: Repository<LedgerEvent>) {}

  /**
   * Records an event. Pass a transactional EntityManager when called as part
   * of a larger write (e.g. sale creation) so the event commits atomically
   * with the rest of the change.
   */
  async record(
    businessId: string,
    type: LedgerEventType,
    amount?: number,
    metadata?: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<LedgerEvent> {
    const repo = manager ? manager.getRepository(LedgerEvent) : this.events;
    return repo.save(repo.create({ businessId, type, amount, metadata }));
  }

  /**
   * Writes several events in one INSERT instead of one round trip per event.
   * Use this instead of calling record() in a loop — a sale with a handful
   * of line items otherwise turns into that many sequential network
   * round trips just for the ledger writes, which is pure overhead at
   * scale (each one pays full statement + network latency).
   */
  async recordMany(
    events: Array<{ businessId: string; type: LedgerEventType; amount?: number; metadata?: Record<string, unknown> }>,
    manager?: EntityManager,
  ): Promise<void> {
    if (events.length === 0) return;
    const repo = manager ? manager.getRepository(LedgerEvent) : this.events;
    // TypeORM's QueryDeepPartialEntity typing doesn't play well with a
    // plain Record<string, unknown> jsonb column on a bulk insert; the
    // shape is correct, just not one TS can verify through this overload.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await repo.insert(events as any);
  }

  /**
   * Newest-first event history, optionally narrowed to one entity (a
   * product's stock history, a customer's activity...) and/or event types.
   * Page with `before` = the last event's createdAt.
   */
  async listForBusiness(businessId: string, opts: LedgerListOptions = {}): Promise<LedgerEvent[]> {
    const qb = this.events
      .createQueryBuilder('e')
      .where('e.businessId = :businessId', { businessId })
      .orderBy('e.createdAt', 'DESC')
      .addOrderBy('e.id', 'DESC')
      .take(Math.min(opts.limit ?? 50, 200));

    if (opts.entity && opts.entityId) {
      const key = ENTITY_KEY[opts.entity];
      if (opts.entity === 'customer') {
        // Older sale events don't carry customerId, so also match events for
        // any of this customer's sales.
        qb.andWhere(
          `(e.metadata->>'customerId' = :entityId OR e.metadata->>'saleId' IN (
             SELECT s.id::text FROM sales s WHERE s."customerId" = CAST(:entityId AS uuid) AND s."businessId" = :businessId))`,
          { entityId: opts.entityId },
        );
      } else {
        // `key` comes from a fixed lookup table, never from the request.
        qb.andWhere(`e.metadata->>'${key}' = :entityId`, { entityId: opts.entityId });
      }
    }
    if (opts.types && opts.types.length > 0) {
      qb.andWhere('e.type IN (:...types)', { types: opts.types });
    }
    if (opts.before) {
      qb.andWhere('e.createdAt < :before', { before: opts.before });
    }
    return qb.getMany();
  }
}
