import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Business } from './business.entity';
import { DecimalTransformer } from '../common/decimal.transformer';

export enum ExpenseCategory {
  RENT = 'rent',
  TRANSPORT = 'transport',
  SALARY = 'salary',
  UTILITIES = 'utilities',
  SUPPLIES = 'supplies',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

@Entity('expenses')
@Index(['businessId', 'createdAt'])
@Index('UQ_expenses_business_clientRef', ['businessId', 'clientRef'], { unique: true, where: '"clientRef" IS NOT NULL' })
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column()
  businessId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'enum', enum: ExpenseCategory, default: ExpenseCategory.OTHER })
  category: ExpenseCategory;

  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer() })
  amount: number;

  @Column({ nullable: true })
  description?: string;

  /** UUID made on the phone when the record was created; makes offline sync safe to retry (unique per business). */
  @Column({ type: 'uuid', nullable: true })
  clientRef?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
