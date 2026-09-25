import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  Sale,
  SaleItem,
  Product,
  LedgerEventType,
  PaymentMethod,
  SaleStatus,
  PaymentStatus,
  Transaction,
  TransactionChannel,
  TransactionPurpose,
} from '../../entities';
import { CreateSaleDto } from './dto/create-sale.dto';
import { LedgerService } from '../ledger/ledger.service';
import { withConnectionRetry } from '../../common/retry';

/**
 * Derives payment_status from how much of the sale's total is still
 * outstanding. Deliberately compares against totalAmount, not creditAmount
 * — comparing against creditAmount can't tell "customer paid part cash,
 * rest on credit, at checkout" apart from "customer paid nothing at all",
 * since outstandingBalance starts out equal to creditAmount in both cases.
 * Comparing against the full total fixes that: a sale part-paid at the
 * point of sale is PARTIALLY_PAID from creation, not CREDIT.
 */
export function derivePaymentStatus(totalAmount: number, outstandingBalance: number): PaymentStatus {
  if (outstandingBalance <= 0) return PaymentStatus.PAID;
  if (outstandingBalance >= totalAmount) return PaymentStatus.CREDIT;
  return PaymentStatus.PARTIALLY_PAID;
}

/** Falls back from the sale's declared paymentMethod when no more specific channel was given. */
function defaultChannelFor(method: PaymentMethod): TransactionChannel {
  switch (method) {
    case PaymentMethod.CASH:
      return TransactionChannel.CASH;
    case PaymentMethod.POS:
      return TransactionChannel.POS;
    case PaymentMethod.TRANSFER:
      return TransactionChannel.BANK_TRANSFER;
    default:
      return TransactionChannel.OTHER;
  }
}

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale) private readonly sales: Repository<Sale>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Creates a sale in a fixed, small number of round trips regardless of
   * how many line items it has — one SELECT for every product, one UPDATE
   * for every product's stock, one INSERT for the sale, one bulk INSERT for
   * its items, one bulk INSERT for ledger events, and one INSERT for the
   * payment transaction (if any). A naive per-line loop turns an N-item
   * sale into roughly 3N+5 sequential DB calls; this keeps it at ~6
   * regardless of N, which is what actually matters under concurrent load —
   * each round trip holds a connection out of the pool for its full
   * network latency, and that's the resource that runs out first at scale.
   */
  async create(businessId: string, dto: CreateSaleDto, branchId?: string): Promise<Sale> {
    return withConnectionRetry(() => this.createInner(businessId, dto, branchId));
  }

  private async createInner(businessId: string, dto: CreateSaleDto, branchId?: string): Promise<Sale> {
    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const saleRepo = manager.getRepository(Sale);
      const saleItemRepo = manager.getRepository(SaleItem);

      // Merge lines for the same product (a client could send two lines for
      // one product) so stock is fetched and updated once per product, not
      // once per line.
      const quantityByProductId = new Map<string, number>();
      for (const line of dto.items) {
        quantityByProductId.set(line.productId, (quantityByProductId.get(line.productId) ?? 0) + line.quantity);
      }
      const productIds = [...quantityByProductId.keys()];

      // One round trip for every product in the sale, instead of one per line.
      const products = await productRepo.find({ where: { id: In(productIds), businessId } });
      if (products.length !== productIds.length) {
        const foundIds = new Set(products.map((p) => p.id));
        const missingId = productIds.find((id) => !foundIds.has(id));
        throw new NotFoundException(`Product ${missingId} not found`);
      }
      const productById = new Map(products.map((p) => [p.id, p]));

      for (const [productId, qty] of quantityByProductId) {
        const product = productById.get(productId)!;
        if (product.stockQty < qty) {
          throw new BadRequestException(`Insufficient stock for ${product.name}: have ${product.stockQty}, need ${qty}`);
        }
      }

      let totalAmount = 0;
      let costTotal = 0;
      const itemRows = dto.items.map((line) => {
        const product = productById.get(line.productId)!;
        // Merchant can override the catalog price per line — negotiated
        // price, bulk discount, clearance, whatever the sale actually was.
        // Cost basis always stays the product's real cost, so margin
        // reporting reflects what the sale actually earned.
        const unitPrice = line.unitPrice ?? product.sellingPrice;
        const lineTotal = unitPrice * line.quantity;
        totalAmount += lineTotal;
        costTotal += product.costPrice * line.quantity;
        return {
          productId: product.id,
          productName: product.name,
          quantity: line.quantity,
          unitPrice,
          unitCostPrice: product.costPrice,
          lineTotal,
        };
      });

      const amountPaid = dto.amountPaid ?? (dto.paymentMethod === PaymentMethod.CREDIT ? 0 : totalAmount);
      if (amountPaid > totalAmount) {
        throw new BadRequestException('Amount paid cannot exceed the sale total');
      }
      const creditAmount = totalAmount - amountPaid;

      if (creditAmount > 0 && !dto.customerId) {
        throw new BadRequestException('A customer is required when part of the sale is on credit');
      }

      // One UPDATE covering every affected product's stock, instead of one
      // UPDATE per line — a multi-row VALUES join, not a loop of round trips.
      const remainingStockByProductId = new Map<string, number>();
      const valuesSql: string[] = [];
      const params: unknown[] = [businessId];
      for (const [productId, qty] of quantityByProductId) {
        const product = productById.get(productId)!;
        remainingStockByProductId.set(productId, product.stockQty - qty);
        params.push(productId, qty);
        const idPos = params.length - 1;
        const qtyPos = params.length;
        valuesSql.push(`($${idPos}::uuid, $${qtyPos}::int)`);
      }
      await manager.query(
        `UPDATE products AS p SET "stockQty" = p."stockQty" - v.qty
         FROM (VALUES ${valuesSql.join(', ')}) AS v(id, qty)
         WHERE p.id = v.id AND p."businessId" = $1`,
        params,
      );

      // Cash is physically confirmed by the merchant at the point of sale.
      // Transfer/POS are merchant-entered until a real payment-provider
      // integration exists to verify them — a reference number is not proof.
      const verified = dto.paymentMethod === PaymentMethod.CASH;
      const now = new Date();

      const sale = await saleRepo.save(
        saleRepo.create({
          businessId,
          branchId: branchId ?? null,
          customerId: dto.customerId,
          paymentMethod: dto.paymentMethod,
          status: SaleStatus.CONFIRMED,
          paymentStatus: derivePaymentStatus(totalAmount, creditAmount),
          totalAmount,
          amountPaid,
          creditAmount,
          outstandingBalance: creditAmount,
          costTotal,
          paymentReference: dto.paymentReference,
          verified,
          confirmedAt: now,
        }),
      );

      // Bulk insert every line in one statement instead of one INSERT per item.
      const insertResult = await saleItemRepo.insert(itemRows.map((row) => ({ ...row, saleId: sale.id })));
      sale.items = itemRows.map(
        (row, idx) => ({ ...row, saleId: sale.id, id: insertResult.identifiers[idx].id as string }) as SaleItem,
      );

      const ledgerEvents: Array<{
        businessId: string;
        type: LedgerEventType;
        amount?: number;
        metadata?: Record<string, unknown>;
      }> = [];

      for (const [productId, qty] of quantityByProductId) {
        const product = productById.get(productId)!;
        ledgerEvents.push({
          businessId,
          type: LedgerEventType.INVENTORY_DECREASED,
          metadata: { productId, name: product.name, quantity: qty, remainingStock: remainingStockByProductId.get(productId) },
        });
      }

      ledgerEvents.push({
        businessId,
        type: LedgerEventType.SALE_CREATED,
        amount: totalAmount,
        metadata: { saleId: sale.id, itemCount: itemRows.length, paymentStatus: sale.paymentStatus, verified },
      });

      if (amountPaid > 0) {
        ledgerEvents.push({
          businessId,
          type: LedgerEventType.PAYMENT_RECEIVED,
          amount: amountPaid,
          metadata: { saleId: sale.id, method: dto.paymentMethod },
        });
      }

      if (creditAmount > 0) {
        ledgerEvents.push({
          businessId,
          type: LedgerEventType.CUSTOMER_CREDIT_CREATED,
          amount: creditAmount,
          metadata: { saleId: sale.id, customerId: dto.customerId },
        });
      }

      // One bulk INSERT for every ledger event this sale produces, instead
      // of one round trip per event.
      await this.ledgerService.recordMany(ledgerEvents, manager);

      if (amountPaid > 0) {
        // The point-of-sale payment becomes a Transaction too — the same
        // record type a later repayment or, eventually, a payment-provider
        // feed would use. This is what makes "how was this sale settled"
        // one consistent query regardless of when/how the money moved.
        await manager.getRepository(Transaction).insert({
          businessId,
          customerId: dto.customerId,
          saleId: sale.id,
          channel: dto.channel ?? defaultChannelFor(dto.paymentMethod),
          purpose: TransactionPurpose.SALE_PAYMENT,
          amount: amountPaid,
          reference: dto.paymentReference,
          verified,
        });
      }

      return sale;
    });
  }

  findAll(businessId: string, branchId?: string): Promise<Sale[]> {
    return this.sales.find({
      where: branchId ? { businessId, branchId } : { businessId },
      relations: ['items', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(businessId: string, id: string): Promise<Sale> {
    const sale = await this.sales.findOne({ where: { id, businessId }, relations: ['items', 'customer'] });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  /** Sales for a customer that still have money owed on them, oldest first (for FIFO repayment allocation). */
  findOutstandingForCustomer(businessId: string, customerId: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Sale) : this.sales;
    return repo
      .createQueryBuilder('sale')
      .where('sale.businessId = :businessId', { businessId })
      .andWhere('sale.customerId = :customerId', { customerId })
      .andWhere('sale.outstandingBalance > 0')
      .orderBy('sale.createdAt', 'ASC')
      .getMany();
  }

  /** Applies part of a repayment to one sale's outstanding balance and recomputes its payment status. */
  async applyRepayment(sale: Sale, amount: number, manager: EntityManager): Promise<Sale> {
    sale.outstandingBalance = Math.max(0, sale.outstandingBalance - amount);
    sale.paymentStatus = derivePaymentStatus(sale.totalAmount, sale.outstandingBalance);
    return manager.getRepository(Sale).save(sale);
  }

  async summarizeForPeriod(businessId: string, from: Date, to: Date, branchId?: string) {
    const query = this.sales
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.totalAmount), 0)', 'revenue')
      .addSelect('COALESCE(SUM(sale.totalAmount - sale.costTotal), 0)', 'grossProfit')
      .addSelect('COALESCE(SUM(sale.amountPaid), 0)', 'cashCollected')
      .addSelect('COALESCE(SUM(sale.creditAmount), 0)', 'creditIssued')
      .addSelect('COUNT(sale.id)', 'saleCount')
      .where('sale.businessId = :businessId', { businessId })
      .andWhere('sale.createdAt >= :from', { from })
      .andWhere('sale.createdAt <= :to', { to });
    if (branchId) query.andWhere('sale.branchId = :branchId', { branchId });
    const result = await query.getRawOne<{
        revenue: string;
        grossProfit: string;
        cashCollected: string;
        creditIssued: string;
        saleCount: string;
      }>();

    return {
      revenue: Number(result?.revenue ?? 0),
      grossProfit: Number(result?.grossProfit ?? 0),
      cashCollected: Number(result?.cashCollected ?? 0),
      creditIssued: Number(result?.creditIssued ?? 0),
      saleCount: Number(result?.saleCount ?? 0),
    };
  }
}
