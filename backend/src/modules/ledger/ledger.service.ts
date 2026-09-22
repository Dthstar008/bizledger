import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LedgerEvent, LedgerEventType } from '../../entities';

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

  async listForBusiness(businessId: string, limit = 100): Promise<LedgerEvent[]> {
    return this.events.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
