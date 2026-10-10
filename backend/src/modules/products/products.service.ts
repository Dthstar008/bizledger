import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Product, LedgerEventType } from '../../entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { LedgerService } from '../ledger/ledger.service';
import { withConnectionRetry } from '../../common/retry';
import { Actor, actorMeta } from '../../common/current-business.decorator';

/** Blank barcodes are stored as NULL so the per-business unique index only applies to real codes. */
export function normalizeBarcode(barcode?: string): string | null {
  const trimmed = barcode?.trim();
  return trimmed ? trimmed : null;
}

function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; driverError?: { code?: string } };
  return e?.code ?? e?.driverError?.code;
}

function toBarcodeConflict(err: unknown): unknown {
  if (pgCode(err) === '23505') {
    return new ConflictException('Another product already uses this barcode');
  }
  return err;
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export interface UploadedImage {
  buffer: Buffer;
  size: number;
}

/**
 * Identifies an image by its first bytes rather than trusting the
 * client-supplied Content-Type, so a renamed file can't be stored as a photo.
 */
export function detectImageType(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

// Fields whose edits are recorded as PRODUCT_UPDATED (stock has its own event).
const TRACKED_FIELDS = ['name', 'sku', 'barcode', 'costPrice', 'sellingPrice', 'lowStockThreshold'] as const;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
  ) {}

  async create(businessId: string, dto: CreateProductDto, actor?: Actor): Promise<Product> {
    // Transactional so the product and its PRODUCT_CREATED event commit
    // together; retried because a connection that fails to establish means
    // nothing was written yet.
    return withConnectionRetry(() => this.createInner(businessId, dto, actor)).catch((err) => {
      throw toBarcodeConflict(err);
    });
  }

  private async createInner(businessId: string, dto: CreateProductDto, actor?: Actor): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager
        .getRepository(Product)
        .save(this.products.create({ ...dto, barcode: normalizeBarcode(dto.barcode), businessId }));
      await this.ledgerService.record(
        businessId,
        LedgerEventType.PRODUCT_CREATED,
        undefined,
        { productId: product.id, name: product.name, stockQty: product.stockQty, ...actorMeta(actor) },
        manager,
      );
      return product;
    });
  }

  findAll(businessId: string): Promise<Product[]> {
    return this.products.find({ where: { businessId }, order: { name: 'ASC' } });
  }

  async findByBarcode(businessId: string, code: string): Promise<Product> {
    const barcode = code.trim();
    // Same limit as when a barcode is saved, so nothing longer can ever match.
    if (!barcode || barcode.length > 64) throw new BadRequestException('Enter a barcode of 1 to 64 characters');
    const product = await this.products.findOne({ where: { businessId, barcode } });
    if (!product) throw new NotFoundException(`No product with barcode ${code}`);
    return product;
  }

  async findOne(businessId: string, id: string): Promise<Product> {
    const product = await this.products.findOne({ where: { id, businessId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /** Loads and row-locks a product inside a transaction, so a concurrent sale can't interleave with the edit. */
  private async lockProduct(manager: EntityManager, businessId: string, id: string): Promise<Product> {
    const product = await manager
      .getRepository(Product)
      .findOne({ where: { id, businessId }, lock: { mode: 'pessimistic_write' } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /**
   * Field edits record PRODUCT_UPDATED (before -> after per changed field);
   * a stock change records INVENTORY_ADJUSTED with the delta and reason.
   * Both commit atomically with the edit.
   */
  async update(businessId: string, id: string, dto: UpdateProductDto, actor?: Actor): Promise<Product> {
    const { stockAdjustmentReason, ...fields } = dto;
    try {
      return await this.dataSource.transaction(async (manager) => {
        const product = await this.lockProduct(manager, businessId, id);
        const next: Partial<Product> = { ...fields };
        if (fields.barcode !== undefined) next.barcode = normalizeBarcode(fields.barcode);

        const changes: Record<string, { from: unknown; to: unknown }> = {};
        for (const key of TRACKED_FIELDS) {
          if (next[key] !== undefined && next[key] !== product[key]) {
            changes[key] = { from: product[key] ?? null, to: next[key] };
          }
        }
        const stockFrom = product.stockQty;
        const stockTo = next.stockQty ?? stockFrom;

        Object.assign(product, next);
        const saved = await manager.getRepository(Product).save(product);

        const events: Parameters<LedgerService['recordMany']>[0] = [];
        if (Object.keys(changes).length > 0) {
          events.push({
            businessId,
            type: LedgerEventType.PRODUCT_UPDATED,
            metadata: { productId: id, name: saved.name, changes, ...actorMeta(actor) },
          });
        }
        if (stockTo !== stockFrom) {
          events.push({
            businessId,
            type: LedgerEventType.INVENTORY_ADJUSTED,
            metadata: {
              productId: id,
              name: saved.name,
              from: stockFrom,
              to: stockTo,
              delta: stockTo - stockFrom,
              reason: stockAdjustmentReason?.trim() || null,
              ...actorMeta(actor),
            },
          });
        }
        await this.ledgerService.recordMany(events, manager);
        return saved;
      });
    } catch (err) {
      throw toBarcodeConflict(err);
    }
  }

  async remove(businessId: string, id: string, actor?: Actor): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const product = await this.lockProduct(manager, businessId, id);
        await manager.getRepository(Product).delete({ id, businessId });
        await this.ledgerService.record(
          businessId,
          LedgerEventType.PRODUCT_DELETED,
          undefined,
          { productId: id, name: product.name, stockQty: product.stockQty, ...actorMeta(actor) },
          manager,
        );
      });
    } catch (err) {
      // sale_items reference products with ON DELETE RESTRICT: a sold product can't be removed.
      if (pgCode(err) === '23503') {
        throw new ConflictException(
          "This product has sales history, so it can't be deleted. Set its stock to 0 to stop selling it.",
        );
      }
      throw err;
    }
  }

  async setImage(businessId: string, id: string, file: UploadedImage | undefined, actor?: Actor): Promise<Product> {
    if (!file || !file.buffer?.length) throw new BadRequestException('Choose a photo to upload');
    if (file.size > MAX_IMAGE_BYTES) throw new BadRequestException('Photo is too large (max 2 MB)');
    const mimeType = detectImageType(file.buffer);
    if (!mimeType) throw new BadRequestException('Upload a JPEG, PNG or WebP photo');

    return this.dataSource.transaction(async (manager) => {
      const product = await this.lockProduct(manager, businessId, id);
      const replaced = !!product.imageUpdatedAt;
      await manager.query(
        `INSERT INTO product_images ("productId", "businessId", "mimeType", "data", "size", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT ("productId") DO UPDATE
           SET "mimeType" = EXCLUDED."mimeType", "data" = EXCLUDED."data", "size" = EXCLUDED."size", "updatedAt" = now()`,
        [id, businessId, mimeType, file.buffer, file.buffer.length],
      );
      product.imageUpdatedAt = new Date();
      const saved = await manager.getRepository(Product).save(product);
      await this.ledgerService.record(
        businessId,
        LedgerEventType.PRODUCT_UPDATED,
        undefined,
        { productId: id, name: product.name, image: replaced ? 'replaced' : 'added', ...actorMeta(actor) },
        manager,
      );
      return saved;
    });
  }

  async getImage(businessId: string, id: string): Promise<{ data: Buffer; mimeType: string }> {
    const rows: { data: Buffer; mimeType: string }[] = await this.dataSource.query(
      `SELECT "data", "mimeType" FROM product_images WHERE "productId" = $1 AND "businessId" = $2`,
      [id, businessId],
    );
    if (rows.length === 0) throw new NotFoundException('This product has no photo');
    return rows[0];
  }

  async removeImage(businessId: string, id: string, actor?: Actor): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const product = await this.lockProduct(manager, businessId, id);
      if (!product.imageUpdatedAt) return product;
      await manager.query(`DELETE FROM product_images WHERE "productId" = $1 AND "businessId" = $2`, [id, businessId]);
      product.imageUpdatedAt = null;
      const saved = await manager.getRepository(Product).save(product);
      await this.ledgerService.record(
        businessId,
        LedgerEventType.PRODUCT_UPDATED,
        undefined,
        { productId: id, name: product.name, image: 'removed', ...actorMeta(actor) },
        manager,
      );
      return saved;
    });
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
