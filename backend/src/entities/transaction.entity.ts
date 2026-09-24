import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Business } from './business.entity';
import { Customer } from './customer.entity';
import { Sale } from './sale.entity';
import { DecimalTransformer } from '../common/decimal.transformer';

/**
 * The channel money actually moved through. Deliberately more granular than
 * Sale.paymentMethod ("how the merchant described the sale") because
 * reconciliation eventually needs to know exactly which rail — a bank
 * transfer and an OPay transfer show up in different feeds.
 */
export enum TransactionChannel {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  POS = 'pos',
  OPAY = 'opay',
  PALMPAY = 'palmpay',
  OTHER = 'other',
}

/**
 * Where this record came from. Only MERCHANT_ENTERED exists today — every
 * transaction is typed in by hand. PROVIDER_FEED is reserved for a future
 * bank/POS/wallet integration that pushes transactions independent of any
 * sale the merchant has recorded; those would land with matchStatus
 * UNMATCHED and saleId null until reconciled.
 */
export enum TransactionSource {
  MERCHANT_ENTERED = 'merchant_entered',
  PROVIDER_FEED = 'provider_feed',
}

export enum TransactionMatchStatus {
  MATCHED = 'matched',
  UNMATCHED = 'unmatched',
  DISPUTED = 'disputed',
}

/** Distinguishes the payment taken at the moment of sale from a later repayment against an outstanding balance — both are Transactions, but the UI shows them differently. */
export enum TransactionPurpose {
  SALE_PAYMENT = 'sale_payment',
  DEBT_REPAYMENT = 'debt_repayment',
}

/**
 * The record of money actually moving — separate from Sale, which is the
 * merchant's record of a business event. A sale is settled by one or more
 * Transactions (one at the point of sale, more later as debt gets repaid).
 * This is the layer a future payment-provider feed would write into, so
 * reconciliation isn't tied to how the sale was originally entered.
 */
@Entity('transactions')
@Index(['businessId', 'customerId'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column()
  businessId: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @Column({ nullable: true })
  customerId?: string;

  /** The sale this transaction is matched to. Null only makes sense for an unmatched provider-feed transaction — every merchant-entered transaction is matched immediately. */
  @ManyToOne(() => Sale, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'saleId' })
  sale?: Sale;

  @Column({ nullable: true })
  @Index()
  saleId?: string;

  @Column({ type: 'enum', enum: TransactionChannel })
  channel: TransactionChannel;

  @Column({ type: 'enum', enum: TransactionSource, default: TransactionSource.MERCHANT_ENTERED })
  source: TransactionSource;

  @Column({ type: 'enum', enum: TransactionMatchStatus, default: TransactionMatchStatus.MATCHED })
  matchStatus: TransactionMatchStatus;

  @Column({ type: 'enum', enum: TransactionPurpose })
  purpose: TransactionPurpose;

  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer() })
  amount: number;

  /** Bank app reference, POS slip number, provider transaction id — not proof of payment by itself. */
  @Column({ nullable: true })
  reference?: string;

  /**
   * True only when confirmed by something other than the merchant's own
   * say-so. Cash is physically confirmed at the point of sale. Everything
   * else stays unverified until a real payment-provider integration exists
   * (source=PROVIDER_FEED transactions would be verified by construction).
   */
  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt: Date;
}
