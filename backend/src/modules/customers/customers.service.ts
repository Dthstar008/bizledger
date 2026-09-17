import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Customer, Sale, Transaction, TransactionPurpose, TransactionChannel, LedgerEventType } from '../../entities';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateRepaymentDto } from './dto/create-repayment.dto';
import { LedgerService } from '../ledger/ledger.service';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Sale) private readonly sales: Repository<Sale>,
    @InjectRepository(Transaction) private readonly transactions: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
    private readonly salesService: SalesService,
  ) {}

  create(businessId: string, dto: CreateCustomerDto): Promise<Customer> {
    return this.customers.save(this.customers.create({ ...dto, businessId }));
  }

  async findAll(businessId: string) {
    const customers = await this.customers.find({ where: { businessId }, order: { name: 'ASC' } });
    const balances = await this.balancesForBusiness(businessId);
    return customers.map((c) => ({ ...c, outstandingBalance: balances.get(c.id) ?? 0 }));
  }

  async findOne(businessId: string, id: string) {
    const customer = await this.customers.findOne({ where: { id, businessId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const [creditSales, repayments] = await Promise.all([
      this.sales.find({ where: { businessId, customerId: id }, order: { createdAt: 'DESC' } }),
      // Debt repayments only — the point-of-sale transaction for a sale is
      // implicit in the sale itself, so this list is "money that arrived
      // after the fact", which is what the Repayments section shows.
      this.transactions.find({
        where: { businessId, customerId: id, purpose: TransactionPurpose.DEBT_REPAYMENT },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const outstandingBalance = creditSales.reduce((sum, s) => sum + s.outstandingBalance, 0);

    return {
      ...customer,
      outstandingBalance,
      creditSales: creditSales.filter((s) => s.creditAmount > 0),
      repayments,
    };
  }

  /**
   * Allocates a repayment across the customer's outstanding sales, oldest
   * first, decrementing each sale's outstandingBalance and flipping its
   * paymentStatus (credit -> partially_paid -> paid) as it clears. One
   * Transaction row is written per sale touched, so the audit trail shows
   * exactly which sale each naira went against and which channel it
   * arrived through.
   */
  async addRepayment(businessId: string, customerId: string, dto: CreateRepaymentDto): Promise<Transaction[]> {
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, { where: { id: customerId, businessId } });
      if (!customer) throw new NotFoundException('Customer not found');

      const outstandingSales = await this.salesService.findOutstandingForCustomer(businessId, customerId, manager);
      const totalOutstanding = outstandingSales.reduce((sum, s) => sum + s.outstandingBalance, 0);

      if (dto.amount > totalOutstanding) {
        throw new BadRequestException('Repayment exceeds outstanding balance');
      }

      const transactionRepo = manager.getRepository(Transaction);
      const created: Transaction[] = [];
      let remaining = dto.amount;

      for (const sale of outstandingSales) {
        if (remaining <= 0) break;
        const applied = Math.min(remaining, sale.outstandingBalance);
        await this.salesService.applyRepayment(sale, applied, manager);

        const transaction = await transactionRepo.save(
          transactionRepo.create({
            businessId,
            customerId,
            saleId: sale.id,
            channel: dto.channel,
            purpose: TransactionPurpose.DEBT_REPAYMENT,
            amount: applied,
            reference: dto.reference,
            note: dto.note,
            verified: dto.channel === TransactionChannel.CASH,
          }),
        );
        created.push(transaction);

        await this.ledgerService.record(
          businessId,
          LedgerEventType.CUSTOMER_CREDIT_REPAID,
          applied,
          { customerId, saleId: sale.id, transactionId: transaction.id, paymentStatus: sale.paymentStatus },
          manager,
        );

        remaining -= applied;
      }

      return created;
    });
  }

  async totalOutstandingDebt(businessId: string): Promise<number> {
    const balances = await this.balancesForBusiness(businessId);
    return [...balances.values()].reduce((sum, v) => sum + v, 0);
  }

  private async balancesForBusiness(businessId: string): Promise<Map<string, number>> {
    const rows: { customerId: string; total: string }[] = await this.sales
      .createQueryBuilder('sale')
      .select('sale.customerId', 'customerId')
      .addSelect('SUM(sale.outstandingBalance)', 'total')
      .where('sale.businessId = :businessId', { businessId })
      .andWhere('sale.customerId IS NOT NULL')
      .groupBy('sale.customerId')
      .getRawMany();

    const balances = new Map<string, number>();
    for (const row of rows) {
      balances.set(row.customerId, parseFloat(row.total));
    }
    return balances;
  }
}
