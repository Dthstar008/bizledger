import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { ProductsService } from '../products/products.service';

describe('SalesService.findOne branch scoping', () => {
  const build = (found: unknown) => {
    const sales = { findOne: jest.fn().mockResolvedValue(found) };
    return { service: new SalesService(sales as any, {} as any, {} as any), sales };
  };

  it('limits the lookup to the given branch (staff)', async () => {
    const { service, sales } = build({ id: 'sale-1' });
    await service.findOne('business-1', 'sale-1', 'branch-a');
    expect(sales.findOne).toHaveBeenCalledWith({
      where: { id: 'sale-1', businessId: 'business-1', branchId: 'branch-a' },
      relations: ['items', 'customer'],
    });
  });

  it('looks across every branch without one (owners)', async () => {
    const { service, sales } = build({ id: 'sale-1' });
    await service.findOne('business-1', 'sale-1');
    expect(sales.findOne.mock.calls[0][0].where).toEqual({ id: 'sale-1', businessId: 'business-1' });
  });

  it("answers 404 for a sale in another branch, so its existence isn't revealed", async () => {
    const { service } = build(null);
    await expect(service.findOne('business-1', 'sale-1', 'branch-b')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProductsService.findByBarcode input', () => {
  const products = { findOne: jest.fn().mockResolvedValue({ id: 'p1' }) };
  const service = new ProductsService(products as any, {} as any, {} as any);

  it('rejects empty and over-long barcodes before querying', async () => {
    await expect(service.findByBarcode('business-1', '   ')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.findByBarcode('business-1', 'x'.repeat(65))).rejects.toBeInstanceOf(BadRequestException);
    expect(products.findOne).not.toHaveBeenCalled();
  });

  it('looks up a trimmed barcode within the business', async () => {
    await service.findByBarcode('business-1', ' 6151100060073 ');
    expect(products.findOne).toHaveBeenCalledWith({ where: { businessId: 'business-1', barcode: '6151100060073' } });
  });
});
