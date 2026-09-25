import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product, LedgerEventType } from '../../entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { LedgerService } from '../ledger/ledger.service';
import { withConnectionRetry } from '../../common/retry';

/** Blank barcodes are stored as NULL so the per-business unique index only applies to real codes. */
export function normalizeBarcode(barcode?: string): string | null {
  const trimmed = barcode?.trim();
  return trimmed ? trimmed : null;
}

function toBarcodeConflict(err: unknown): unknown {
  const e = err as { code?: string; driverError?: { code?: string } };
  if ((e?.code ?? e?.driverError?.code) === '23505') {
    return new ConflictException('Another product already uses this barcode');
  }
  return err;
}

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
    return withConnectionRetry(() => this.createInner(businessId, dto)).catch((err) => {
      throw toBarcodeConflict(err);
    });
  }

  private async createInner(businessId: string, dto: CreateProductDto): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager
        .getRepository(Product)
        .save(this.products.create({ ...dto, barcode: normalizeBarcode(dto.barcode), businessId }));
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

  async findByBarcode(businessId: string, code: string): Promise<Product> {
    const product = await this.products.findOne({ where: { businessId, barcode: code.trim() } });
    if (!product) throw new NotFoundException(`No product with barcode ${code}`);
    return product;
  }

  async findOne(businessId: string, id: string): Promise<Product> {
    const product = await this.products.findOne({ where: { id, businessId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(businessId: string, id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(businessId, id);
    Object.assign(product, dto);
    if (dto.barcode !== undefined) product.barcode = normalizeBarcode(dto.barcode);
    try {
      return await this.products.save(product);
    } catch (err) {
      throw toBarcodeConflict(err);
    }
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
