import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale, SaleItem, Product } from '../../entities';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem, Product]), LedgerModule, BranchesModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
