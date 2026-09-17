import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sale } from './sale.entity';
import { Product } from './product.entity';
import { DecimalTransformer } from '../common/decimal.transformer';

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

  @Column()
  saleId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @Column()
  productName: string;

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer() })
  unitPrice: number;

  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer() })
  unitCostPrice: number;

  @Column('decimal', { precision: 14, scale: 2, transformer: new DecimalTransformer() })
  lineTotal: number;
}
