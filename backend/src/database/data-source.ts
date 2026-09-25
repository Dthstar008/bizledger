import 'dotenv/config';
import { DataSource } from 'typeorm';
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
} from '../entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'bizledger',
  entities: [Business, User, Product, Customer, Sale, SaleItem, Expense, Transaction, LedgerEvent, Branch],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
