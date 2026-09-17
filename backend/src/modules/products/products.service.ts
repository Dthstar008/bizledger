import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, LedgerEventType } from '../../entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly ledgerService: LedgerService,
  ) {}

  async create(businessId: string, dto: CreateProductDto): Promise<Product> {
    const product = await this.products.save(this.products.create({ ...dto, businessId }));
    await this.ledgerService.record(businessId, LedgerEventType.PRODUCT_CREATED, undefined, {
      productId: product.id,
      name: product.name,
      stockQty: product.stockQty,
    });
    return product;
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
    const all = await this.findAll(businessId);
    return all.filter((p) => p.stockQty <= p.lowStockThreshold);
  }

  async totalStockValue(businessId: string): Promise<number> {
    const all = await this.findAll(businessId);
    return all.reduce((sum, p) => sum + p.costPrice * p.stockQty, 0);
  }
}
