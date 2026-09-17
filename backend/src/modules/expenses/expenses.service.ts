import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Expense, LedgerEventType } from '../../entities';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    private readonly ledgerService: LedgerService,
  ) {}

  async create(businessId: string, dto: CreateExpenseDto): Promise<Expense> {
    const expense = await this.expenses.save(this.expenses.create({ ...dto, businessId }));
    await this.ledgerService.record(businessId, LedgerEventType.EXPENSE_CREATED, expense.amount, {
      expenseId: expense.id,
      category: expense.category,
    });
    return expense;
  }

  findAll(businessId: string): Promise<Expense[]> {
    return this.expenses.find({ where: { businessId }, order: { createdAt: 'DESC' } });
  }

  async totalForPeriod(businessId: string, from: Date, to: Date): Promise<number> {
    const rows = await this.expenses.find({ where: { businessId, createdAt: Between(from, to) } });
    return rows.reduce((sum, e) => sum + e.amount, 0);
  }
}
