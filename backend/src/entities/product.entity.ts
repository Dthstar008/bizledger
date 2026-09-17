import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Business } from './business.entity';
import { DecimalTransformer } from '../common/decimal.transformer';

@Entity('products')
@Index(['businessId', 'name'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column()
  businessId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  sku?: string;

  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer() })
  costPrice: number;

  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer() })
  sellingPrice: number;

  @Column('int', { default: 0 })
  stockQty: number;

  @Column('int', { default: 0 })
  lowStockThreshold: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
