import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer, Sale, Transaction } from '../../entities';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Sale, Transaction]), LedgerModule, SalesModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
