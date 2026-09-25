import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../modules/auth/auth.service';
import { BranchesService } from '../modules/branches/branches.service';
import { EmployeesService } from '../modules/employees/employees.service';
import { ProductsService } from '../modules/products/products.service';
import { CustomersService } from '../modules/customers/customers.service';
import { SalesService } from '../modules/sales/sales.service';
import { ExpensesService } from '../modules/expenses/expenses.service';
import { PaymentMethod, ExpenseCategory, TransactionChannel } from '../entities';

/**
 * Seeds one demo merchant mirroring the examples from the product blueprint
 * (Oraimo Charger, Chinedu Okafor credit history) so the dashboard has
 * something real to show. Run with: npm run seed
 */
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const authService = app.get(AuthService);
  const productsService = app.get(ProductsService);
  const customersService = app.get(CustomersService);
  const salesService = app.get(SalesService);
  const expensesService = app.get(ExpensesService);
  const branchesService = app.get(BranchesService, { strict: false });
  const employeesService = app.get(EmployeesService, { strict: false });

  const email = 'demo@bizledger.ng';
  let auth;
  try {
    auth = await authService.register({
      businessName: 'Chidi Phone Accessories',
      ownerName: 'Chidi Eze',
      phone: '08012345678',
      email,
      password: 'password123',
      confirmedAdult: true,
    });
  } catch {
    auth = await authService.login({ email, password: 'password123' });
  }
  const businessId = auth.business.id;

  // Stage 2: a second branch and a staff member pinned to it, so the demo
  // shows roles and branch filtering out of the box.
  const branches = await branchesService.findAll(businessId);
  const mainBranch = branches.find((b) => b.isDefault) ?? branches[0];
  let lekki = branches.find((b) => b.name === 'Lekki Branch');
  if (!lekki) lekki = await branchesService.create(businessId, { name: 'Lekki Branch', address: 'Lekki Phase 1, Lagos' });
  try {
    await employeesService.create(businessId, {
      name: 'Ada Okoye',
      email: 'staff@bizledger.ng',
      password: 'password123',
      branchId: lekki.id,
    });
  } catch {
    // already seeded
  }

  const charger = await productsService.create(businessId, {
    name: 'Oraimo Charger',
    sku: 'ORA-CHG-01',
    costPrice: 6000,
    sellingPrice: 9000,
    stockQty: 20,
    lowStockThreshold: 5,
  });

  const earbuds = await productsService.create(businessId, {
    name: 'Bluetooth Earbuds',
    sku: 'BT-EAR-01',
    costPrice: 8000,
    sellingPrice: 13000,
    stockQty: 4,
    lowStockThreshold: 5,
  });

  const chinedu = await customersService.create(businessId, {
    name: 'Chinedu Okafor',
    phone: '08099998888',
  });

  await salesService.create(businessId, {
    items: [{ productId: charger.id, quantity: 2 }],
    paymentMethod: PaymentMethod.CASH,
  }, mainBranch?.id);

  await salesService.create(businessId, {
    items: [{ productId: earbuds.id, quantity: 1 }],
    paymentMethod: PaymentMethod.CREDIT,
    customerId: chinedu.id,
    amountPaid: 0,
  }, lekki.id);

  await customersService.addRepayment(businessId, chinedu.id, {
    amount: 5000,
    channel: TransactionChannel.CASH,
    note: 'Part payment',
  });

  await expensesService.create(businessId, {
    category: ExpenseCategory.TRANSPORT,
    amount: 3000,
    description: 'Trip to restock at Computer Village',
  });

  console.log('Seed complete.');
  console.log(`Owner login: "${email}" / "password123"`);
  console.log('Staff login: "staff@bizledger.ng" / "password123" (Lekki Branch)');

  await app.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
