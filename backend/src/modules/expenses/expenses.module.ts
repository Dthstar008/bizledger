import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../../entities';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [TypeOrmModule.forFeature([Expense]), LedgerModule, BranchesModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
