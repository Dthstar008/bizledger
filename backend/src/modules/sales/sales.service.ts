import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, Repository } from 'typeorm';
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

/** Derives payment_status from how much of a sale's credit portion is still outstanding. */
export function derivePaymentStatus(creditAmount: number, outstandingBalance: number): PaymentStatus {
  if (creditAmount === 0) return PaymentStatus.PAID;
  if (outstandingBalance <= 0) return PaymentStatus.PAID;
  if (outstandingBalance >= creditAmount) return PaymentStatus.CREDIT;
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

  async create(businessId: string, dto: CreateSaleDto): Promise<Sale> {
    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const saleRepo = manager.getRepository(Sale);
      const saleItemRepo = manager.getRepository(SaleItem);

      const items: SaleItem[] = [];
      let totalAmount = 0;
      let costTotal = 0;

      for (const line of dto.items) {
        const product = await productRepo.findOne({ where: { id: line.productId, businessId } });
        if (!product) {
          throw new NotFoundException(`Product ${line.productId} not found`);
        }
        if (product.stockQty < line.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}: have ${product.stockQty}, need ${line.quantity}`,
          );
        }

        const lineTotal = product.sellingPrice * line.quantity;
        totalAmount += lineTotal;
        costTotal += product.costPrice * line.quantity;

        product.stockQty -= line.quantity;
        await productRepo.save(product);

        await this.ledgerService.record(
          businessId,
          LedgerEventType.INVENTORY_DECREASED,
          undefined,
          { productId: product.id, name: product.name, quantity: line.quantity, remainingStock: product.stockQty },
          manager,
        );

        items.push(
          saleItemRepo.create({
            productId: product.id,
            productName: product.name,
            quantity: line.quantity,
            unitPrice: product.sellingPrice,
            unitCostPrice: product.costPrice,
            lineTotal,
          }),
        );
      }

      const amountPaid = dto.amountPaid ?? (dto.paymentMethod === PaymentMethod.CREDIT ? 0 : totalAmount);
      if (amountPaid > totalAmount) {
        throw new BadRequestException('Amount paid cannot exceed the sale total');
      }
      const creditAmount = totalAmount - amountPaid;

      if (creditAmount > 0 && !dto.customerId) {
        throw new BadRequestException('A customer is required when part of the sale is on credit');
      }

      // Cash is physically confirmed by the merchant at the point of sale.
      // Transfer/POS are merchant-entered until a real payment-provider
      // integration exists to verify them — a reference number is not proof.
      const verified = dto.paymentMethod === PaymentMethod.CASH;
      const now = new Date();

      const sale = await saleRepo.save(
        saleRepo.create({
          businessId,
          customerId: dto.customerId,
          items,
          paymentMethod: dto.paymentMethod,
          status: SaleStatus.CONFIRMED,
          paymentStatus: derivePaymentStatus(creditAmount, creditAmount),
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

      await this.ledgerService.record(
        businessId,
        LedgerEventType.SALE_CREATED,
        totalAmount,
        { saleId: sale.id, itemCount: items.length, paymentStatus: sale.paymentStatus, verified },
        manager,
      );

      if (amountPaid > 0) {
        // The point-of-sale payment becomes a Transaction too — the same
        // record type a later repayment or, eventually, a payment-provider
        // feed would use. This is what makes "how was this sale settled"
        // one consistent query regardless of when/how the money moved.
        await manager.getRepository(Transaction).save(
          manager.getRepository(Transaction).create({
            businessId,
            customerId: dto.customerId,
            saleId: sale.id,
            channel: dto.channel ?? defaultChannelFor(dto.paymentMethod),
            purpose: TransactionPurpose.SALE_PAYMENT,
            amount: amountPaid,
            reference: dto.paymentReference,
            verified,
          }),
        );

        await this.ledgerService.record(
          businessId,
          LedgerEventType.PAYMENT_RECEIVED,
          amountPaid,
          { saleId: sale.id, method: dto.paymentMethod },
          manager,
        );
      }

      if (creditAmount > 0) {
        await this.ledgerService.record(
          businessId,
          LedgerEventType.CUSTOMER_CREDIT_CREATED,
          creditAmount,
          { saleId: sale.id, customerId: dto.customerId },
          manager,
        );
      }

      return sale;
    });
  }

  findAll(businessId: string): Promise<Sale[]> {
    return this.sales.find({
      where: { businessId },
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
    sale.paymentStatus = derivePaymentStatus(sale.creditAmount, sale.outstandingBalance);
    return manager.getRepository(Sale).save(sale);
  }

  async summarizeForPeriod(businessId: string, from: Date, to: Date) {
    const sales = await this.sales.find({ where: { businessId, createdAt: Between(from, to) } });
    return {
      revenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
      grossProfit: sales.reduce((sum, s) => sum + (s.totalAmount - s.costTotal), 0),
      cashCollected: sales.reduce((sum, s) => sum + s.amountPaid, 0),
      creditIssued: sales.reduce((sum, s) => sum + s.creditAmount, 0),
      saleCount: sales.length,
    };
  }
}
