import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, Repository } from 'typeorm';
import { Expense, LedgerEventType } from '../../entities';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { LedgerService } from '../ledger/ledger.service';
import { withConnectionRetry } from '../../common/retry';
import { Actor, actorMeta } from '../../common/current-business.decorator';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
  ) {}

  async create(businessId: string, dto: CreateExpenseDto, branchId?: string, actor?: Actor): Promise<Expense> {
    // Transactional so the expense and its EXPENSE_CREATED event commit
    // together; retried because a connection that fails to establish means
    // nothing was written yet.
    return withConnectionRetry(() => this.createInner(businessId, dto, branchId, actor));
  }

  private async createInner(businessId: string, dto: CreateExpenseDto, branchId?: string, actor?: Actor): Promise<Expense> {
    return this.dataSource.transaction(async (manager) => {
      const expense = await manager
        .getRepository(Expense)
        .save(this.expenses.create({ ...dto, businessId, branchId: branchId ?? null }));
      await this.ledgerService.record(
        businessId,
        LedgerEventType.EXPENSE_CREATED,
        expense.amount,
        { expenseId: expense.id, category: expense.category, description: expense.description ?? null, ...actorMeta(actor) },
        manager,
      );
      return expense;
    });
  }

  findAll(businessId: string, branchId?: string): Promise<Expense[]> {
    return this.expenses.find({ where: branchId ? { businessId, branchId } : { businessId }, order: { createdAt: 'DESC' } });
  }

  async findOne(businessId: string, id: string): Promise<Expense> {
    const expense = await this.expenses.findOne({ where: { id, businessId } });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  private async lockExpense(manager: EntityManager, businessId: string, id: string): Promise<Expense> {
    const expense = await manager
      .getRepository(Expense)
      .findOne({ where: { id, businessId }, lock: { mode: 'pessimistic_write' } });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  /** Records EXPENSE_UPDATED with before -> after for each changed field; the event amount is the new amount. */
  async update(businessId: string, id: string, dto: UpdateExpenseDto, actor?: Actor): Promise<Expense> {
    return this.dataSource.transaction(async (manager) => {
      const expense = await this.lockExpense(manager, businessId, id);
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of ['category', 'amount', 'description'] as const) {
        if (dto[key] !== undefined && dto[key] !== expense[key]) {
          changes[key] = { from: expense[key] ?? null, to: dto[key] };
        }
      }
      if (Object.keys(changes).length === 0) return expense;
      Object.assign(expense, dto);
      const saved = await manager.getRepository(Expense).save(expense);
      await this.ledgerService.record(
        businessId,
        LedgerEventType.EXPENSE_UPDATED,
        saved.amount,
        { expenseId: id, category: saved.category, changes, ...actorMeta(actor) },
        manager,
      );
      return saved;
    });
  }

  /** The EXPENSE_DELETED event keeps the amount and details, so the ledger still explains the change in totals. */
  async remove(businessId: string, id: string, actor?: Actor): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const expense = await this.lockExpense(manager, businessId, id);
      await manager.getRepository(Expense).delete({ id, businessId });
      await this.ledgerService.record(
        businessId,
        LedgerEventType.EXPENSE_DELETED,
        expense.amount,
        {
          expenseId: id,
          category: expense.category,
          description: expense.description ?? null,
          spentAt: expense.createdAt,
          ...actorMeta(actor),
        },
        manager,
      );
    });
  }

  async totalForPeriod(businessId: string, from: Date, to: Date, branchId?: string): Promise<number> {
    const rows = await this.expenses.find({
      where: branchId ? { businessId, branchId, createdAt: Between(from, to) } : { businessId, createdAt: Between(from, to) },
    });
    return rows.reduce((sum, e) => sum + e.amount, 0);
  }
}
