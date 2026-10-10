import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LedgerEventType, Product } from '../../entities';
import { detectImageType, ProductsService } from './products.service';

const actor = { userId: 'user-1', branchId: 'branch-1' };

function build(product: Partial<Product> | null, opts: { deleteError?: unknown } = {}) {
  const productRepo = {
    findOne: jest.fn().mockResolvedValue(product ? { ...product } : null),
    save: jest.fn(async (p) => p),
    delete: jest.fn(async () => {
      if (opts.deleteError) throw opts.deleteError;
    }),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Product) return productRepo;
      throw new Error('unexpected entity');
    }),
    query: jest.fn().mockResolvedValue([]),
  };
  const dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)) };
  const ledgerService = { record: jest.fn().mockResolvedValue(undefined), recordMany: jest.fn().mockResolvedValue(undefined) };
  const service = new ProductsService({ create: (v: unknown) => v } as any, dataSource as any, ledgerService as any);
  return { service, productRepo, manager, ledgerService };
}

const base: Partial<Product> = {
  id: 'p1',
  businessId: 'biz',
  name: 'Oraimo charger',
  costPrice: 6000,
  sellingPrice: 9000,
  stockQty: 10,
  lowStockThreshold: 2,
  imageUpdatedAt: null,
};

describe('ProductsService.update (event recording)', () => {
  it('records INVENTORY_ADJUSTED with delta and reason when stock changes, inside the transaction', async () => {
    const { service, ledgerService, manager, productRepo } = build(base);
    await service.update('biz', 'p1', { stockQty: 25, stockAdjustmentReason: 'Restock' }, actor);

    expect(productRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: { mode: 'pessimistic_write' } }));
    const [events, usedManager] = ledgerService.recordMany.mock.calls[0];
    expect(usedManager).toBe(manager);
    expect(events).toEqual([
      expect.objectContaining({
        type: LedgerEventType.INVENTORY_ADJUSTED,
        metadata: expect.objectContaining({ productId: 'p1', from: 10, to: 25, delta: 15, reason: 'Restock', actorId: 'user-1', branchId: 'branch-1' }),
      }),
    ]);
  });

  it('records PRODUCT_UPDATED with before -> after for each changed field only', async () => {
    const { service, ledgerService } = build(base);
    await service.update('biz', 'p1', { sellingPrice: 9500, name: 'Oraimo charger' }, actor);
    const [events] = ledgerService.recordMany.mock.calls[0];
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(LedgerEventType.PRODUCT_UPDATED);
    expect(events[0].metadata.changes).toEqual({ sellingPrice: { from: 9000, to: 9500 } });
  });

  it('records nothing when nothing actually changed', async () => {
    const { service, ledgerService } = build(base);
    await service.update('biz', 'p1', { sellingPrice: 9000, stockQty: 10 }, actor);
    expect(ledgerService.recordMany.mock.calls[0][0]).toEqual([]);
  });

  it('404s for a product outside the business', async () => {
    const { service } = build(null);
    await expect(service.update('biz', 'nope', { sellingPrice: 1 })).rejects.toThrow(NotFoundException);
  });
});

describe('ProductsService.remove', () => {
  it('records PRODUCT_DELETED inside the transaction', async () => {
    const { service, ledgerService, manager } = build(base);
    await service.remove('biz', 'p1', actor);
    expect(ledgerService.record).toHaveBeenCalledWith(
      'biz',
      LedgerEventType.PRODUCT_DELETED,
      undefined,
      expect.objectContaining({ productId: 'p1', name: 'Oraimo charger' }),
      manager,
    );
  });

  it('turns the "has sales" foreign-key error into a friendly 409', async () => {
    const { service } = build(base, { deleteError: { code: '23503' } });
    await expect(service.remove('biz', 'p1', actor)).rejects.toThrow(ConflictException);
  });
});

describe('product photos', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);

  it('detects image types from their bytes, not the file name', () => {
    expect(detectImageType(jpeg)).toBe('image/jpeg');
    expect(detectImageType(png)).toBe('image/png');
    expect(detectImageType(webp)).toBe('image/webp');
    expect(detectImageType(Buffer.from('<html>not an image'))).toBeNull();
  });

  it('rejects missing, non-image and oversized uploads before touching the database', async () => {
    const { service, manager } = build(base);
    await expect(service.setImage('biz', 'p1', undefined)).rejects.toThrow(BadRequestException);
    await expect(service.setImage('biz', 'p1', { buffer: Buffer.from('%PDF-1.4'), size: 8 })).rejects.toThrow(/JPEG, PNG or WebP/);
    await expect(service.setImage('biz', 'p1', { buffer: jpeg, size: 3 * 1024 * 1024 })).rejects.toThrow(/too large/);
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('stores a photo, stamps imageUpdatedAt and records PRODUCT_UPDATED (added, then replaced)', async () => {
    const first = build(base);
    const saved = await first.service.setImage('biz', 'p1', { buffer: jpeg, size: jpeg.length }, actor);
    expect(first.manager.query.mock.calls[0][1]).toEqual(['p1', 'biz', 'image/jpeg', jpeg, jpeg.length]);
    expect(saved.imageUpdatedAt).toBeInstanceOf(Date);
    expect(first.ledgerService.record.mock.calls[0][3]).toEqual(expect.objectContaining({ image: 'added' }));
    expect(first.ledgerService.record.mock.calls[0][4]).toBe(first.manager);

    const second = build({ ...base, imageUpdatedAt: new Date() });
    await second.service.setImage('biz', 'p1', { buffer: png, size: png.length }, actor);
    expect(second.ledgerService.record.mock.calls[0][3]).toEqual(expect.objectContaining({ image: 'replaced' }));
  });

  it('removing a photo that does not exist is a no-op with no event', async () => {
    const { service, ledgerService, manager } = build(base);
    await service.removeImage('biz', 'p1', actor);
    expect(manager.query).not.toHaveBeenCalled();
    expect(ledgerService.record).not.toHaveBeenCalled();
  });
});
