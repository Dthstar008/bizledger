import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Business } from './business.entity';
import { DecimalTransformer } from '../common/decimal.transformer';

export enum LedgerEventType {
  SALE_CREATED = 'SALE_CREATED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  CUSTOMER_CREDIT_CREATED = 'CUSTOMER_CREDIT_CREATED',
  CUSTOMER_CREDIT_REPAID = 'CUSTOMER_CREDIT_REPAID',
  INVENTORY_DECREASED = 'INVENTORY_DECREASED',
  INVENTORY_ADJUSTED = 'INVENTORY_ADJUSTED',
  EXPENSE_CREATED = 'EXPENSE_CREATED',
  PRODUCT_CREATED = 'PRODUCT_CREATED',
}

/**
 * Append-only log of financial/operational events, kept alongside the
 * relational tables. Reporting, reconciliation and future integrations
 * should be derivable by replaying this log per the blueprint's
 * "design around events, not screens" philosophy.
 */
@Entity('ledger_events')
@Index(['businessId', 'createdAt'])
export class LedgerEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column()
  businessId: string;

  @Column({ type: 'enum', enum: LedgerEventType })
  type: LedgerEventType;

  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer(), nullable: true })
  amount?: number;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
