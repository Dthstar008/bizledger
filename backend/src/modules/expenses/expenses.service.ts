import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { Expense, LedgerEventType } from '../../entities';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { LedgerService } from '../ledger/ledger.service';
import { withConnectionRetry } from '../../common/retry';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
  ) {}

  async create(businessId: string, dto: CreateExpenseDto, branchId?: string): Promise<Expense> {
    // Transactional for the same reason as ProductsService.create(): a
    // ledger-write failure shouldn't leave an expense recorded with no
    // audit trail for it. Retried on top since a connection that fails to
    // even establish means nothing was written yet.
    return withConnectionRetry(() => this.createInner(businessId, dto, branchId));
  }

  private async createInner(businessId: string, dto: CreateExpenseDto, branchId?: string): Promise<Expense> {
    return this.dataSource.transaction(async (manager) => {
      const expense = await manager.getRepository(Expense).save(this.expenses.create({ ...dto, businessId, branchId: branchId ?? null }));
      await this.ledgerService.record(
        businessId,
        LedgerEventType.EXPENSE_CREATED,
        expense.amount,
        { expenseId: expense.id, category: expense.category },
        manager,
      );
      return expense;
    });
  }

  findAll(businessId: string, branchId?: string): Promise<Expense[]> {
    return this.expenses.find({ where: branchId ? { businessId, branchId } : { businessId }, order: { createdAt: 'DESC' } });
  }

  async totalForPeriod(businessId: string, from: Date, to: Date, branchId?: string): Promise<number> {
    const rows = await this.expenses.find({
      where: branchId ? { businessId, branchId, createdAt: Between(from, to) } : { businessId, createdAt: Between(from, to) },
    });
    return rows.reduce((sum, e) => sum + e.amount, 0);
  }
}
