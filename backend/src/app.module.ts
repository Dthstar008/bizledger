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
  Branch,
} from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SalesModule } from './modules/sales/sales.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { BranchesModule } from './modules/branches/branches.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
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
        entities: [Business, User, Product, Customer, Sale, SaleItem, Expense, Transaction, LedgerEvent, Branch],
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        // Schema is managed through versioned migrations now (see
        // src/database/migrations/), not auto-sync — a boot-time schema
        // change from synchronize:true is unsafe with concurrent traffic,
        // and this database is also shared with an unrelated project, so
        // "the schema quietly changes to match whatever the entities say"
        // was never a safe default here to begin with.
        synchronize: false,
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: true,
        // node-postgres defaults to a pool of 10, which becomes the
        // bottleneck under concurrent load well before the DB itself does —
        // every request that needs a connection queues once the pool is
        // exhausted. Tune via DB_POOL_MAX; keep it under whatever your
        // Postgres/pooler's own connection limit allows (Supabase's session
        // pooler has its own cap shared across everything using it).
        extra: {
          max: config.get<number>('database.poolMax'),
          idleTimeoutMillis: 30000,
          // How long a single connection attempt waits before giving up.
          // Matters most on an unreliable network (a flaky dev hotspot, a
          // congested link) — too short and a connection that would have
          // succeeded a second later just fails instead. Too long (or 0 =
          // unbounded, node-postgres's own default) and a genuinely dead
          // DB hangs every request against it instead of failing fast.
          // Tune via DB_CONNECT_TIMEOUT_MS per environment rather than
          // picking one value for both a shaky dev network and production.
          connectionTimeoutMillis: config.get<number>('database.connectTimeoutMs'),
          // TCP keepalive. Without this, a connection that's been idle for
          // a while (e.g. the merchant filling out a form) can get silently
          // killed by a NAT/firewall in between — a mobile carrier's NAT is
          // especially aggressive about this — while the pool still thinks
          // it's healthy. The next query then hangs on a dead socket until
          // it times out, which is exactly "works right after startup, then
          // randomly fails a bit later." Keepalive pings keep the NAT
          // mapping alive and let the OS notice a dead connection quickly
          // so the pool can discard and replace it instead of trying to use it.
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000,
        },
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
    BranchesModule,
    EmployeesModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
