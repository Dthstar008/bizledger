import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Business } from './business.entity';
import { Customer } from './customer.entity';
import { SaleItem } from './sale-item.entity';
import { DecimalTransformer } from '../common/decimal.transformer';

export enum PaymentMethod {
  CASH = 'cash',
  TRANSFER = 'transfer',
  POS = 'pos',
  CREDIT = 'credit',
}

/** Did the sale itself happen — separate from whether it's been paid for. */
export enum SaleStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/** Current payment state. Mutates over time as credit gets repaid. */
export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  CREDIT = 'credit',
}

@Entity('sales')
@Index(['businessId', 'createdAt'])
export class Sale {
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

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.CONFIRMED })
  status: SaleStatus;

  // DB-level default only exists to backfill pre-existing rows when this
  // column is first added; the service layer always sets it explicitly.
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PAID })
  paymentStatus: PaymentStatus;

  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer() })
  totalAmount: number;

  /** Paid at the moment of sale (cash in hand / transfer or POS confirmed then). Never mutated afterward — the period-accurate figure for "cash collected at point of sale". */
  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer() })
  amountPaid: number;

  /** Credit extended at the moment of sale. Never mutated afterward — the period-accurate figure for "credit issued in this sale". */
  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer() })
  creditAmount: number;

  /** Current remaining balance on this sale. Starts equal to creditAmount and is drawn down as repayments are allocated to it — this is what paymentStatus is derived from. */
  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer(), default: 0 })
  outstandingBalance: number;

  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer() })
  costTotal: number;

  /** Merchant-entered transaction reference for transfer/POS payments (bank app reference, POS slip number). Not proof of payment by itself. */
  @Column({ nullable: true })
  paymentReference?: string;

  /**
   * True only when payment is confirmed by something other than the
   * merchant's own say-so. Cash is physically confirmed at the point of
   * sale, so it's verified immediately. Transfer/POS start unverified —
   * genuine verification requires a licensed payment/banking provider
   * integration, which doesn't exist yet. A screenshot is not verification.
   */
  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
