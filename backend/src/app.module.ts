import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import {
  Business,
  User,
  Product,
  Customer,
  Sale,
  SaleItem,
  Expense,
  Transaction,
  LedgerEvent,
} from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SalesModule } from './modules/sales/sales.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        entities: [Business, User, Product, Customer, Sale, SaleItem, Expense, Transaction, LedgerEvent],
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        // MVP convenience: schema auto-syncs from entities. Switch to migrations before production.
        synchronize: true,
      }),
    }),
    AuthModule,
    BusinessesModule,
    ProductsModule,
    CustomersModule,
    SalesModule,
    ExpensesModule,
    LedgerModule,
    DashboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
