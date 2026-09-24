import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { SalesModule } from '../sales/sales.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [SalesModule, ExpensesModule, ProductsModule, CustomersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
