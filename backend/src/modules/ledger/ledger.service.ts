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

  async listForBusiness(businessId: string, limit = 100): Promise<LedgerEvent[]> {
    return this.events.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
