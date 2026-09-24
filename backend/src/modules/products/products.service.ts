import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product, LedgerEventType } from '../../entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { LedgerService } from '../ledger/ledger.service';
import { withConnectionRetry } from '../../common/retry';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
  ) {}

  async create(businessId: string, dto: CreateProductDto): Promise<Product> {
    // Transactional so a ledger-write failure (e.g. a dropped connection)
    // can't leave a product created with no audit trail for it — previously
    // these were two independent writes with nothing to roll either back.
    // Retried on top because a connection that fails to even establish
    // means nothing was written yet, so retrying is safe.
    return withConnectionRetry(() => this.createInner(businessId, dto));
  }

  private async createInner(businessId: string, dto: CreateProductDto): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.getRepository(Product).save(this.products.create({ ...dto, businessId }));
      await this.ledgerService.record(
        businessId,
        LedgerEventType.PRODUCT_CREATED,
        undefined,
        { productId: product.id, name: product.name, stockQty: product.stockQty },
        manager,
      );
      return product;
    });
  }

  findAll(businessId: string): Promise<Product[]> {
    return this.products.find({ where: { businessId }, order: { name: 'ASC' } });
  }

  async findOne(businessId: string, id: string): Promise<Product> {
    const product = await this.products.findOne({ where: { id, businessId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(businessId: string, id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(businessId, id);
    Object.assign(product, dto);
    return this.products.save(product);
  }

  async remove(businessId: string, id: string): Promise<void> {
    const product = await this.findOne(businessId, id);
    await this.products.remove(product);
  }

  async lowStock(businessId: string): Promise<Product[]> {
    return this.products
      .createQueryBuilder('product')
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.stockQty <= product.lowStockThreshold')
      .orderBy('product.name', 'ASC')
      .getMany();
  }

  async totalStockValue(businessId: string): Promise<number> {
    const result = await this.products
      .createQueryBuilder('product')
      .select('COALESCE(SUM(product.costPrice * product.stockQty), 0)', 'total')
      .where('product.businessId = :businessId', { businessId })
      .getRawOne<{ total: string }>();

    return Number(result?.total ?? 0);
  }
}
