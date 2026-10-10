import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 2 (business management) schema: staff roles, branches, and product
 * barcodes.
 *
 * - `users.role` defaults to 'owner' so every account that exists today
 *   stays an owner; staff are only ever created through the employees API.
 * - Every existing business gets a default "Main Branch", and existing
 *   sales/expenses are backfilled to it.
 * - `sales.branchId` / `expenses.branchId` are deliberately NULLABLE: the
 *   hosted API and a local dev server can share one database, so code that
 *   predates this migration must keep working while a new build rolls out.
 * - Stock is NOT per branch — products stay one business-wide pool.
 *
 * Only touches this app's own tables (see InitialSchema for why that matters
 * on the shared Supabase database).
 */
export class Stage2BusinessManagement1790100000000 implements MigrationInterface {
  name = 'Stage2BusinessManagement1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM ('owner', 'staff')`);

    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "businessId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "address" character varying,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branches" PRIMARY KEY ("id"),
        CONSTRAINT "FK_branches_business" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_branches_businessId" ON "branches" ("businessId")`);
    await queryRunner.query(`ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(
      `INSERT INTO "branches" ("businessId", "name", "isDefault") SELECT "id", 'Main Branch', true FROM "businesses"`,
    );

    await queryRunner.query(`ALTER TABLE "users" ADD "role" "users_role_enum" NOT NULL DEFAULT 'owner'`);
    await queryRunner.query(`ALTER TABLE "users" ADD "branchId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL`,
    );

    for (const table of ['sales', 'expenses']) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD "branchId" uuid`);
      await queryRunner.query(
        `UPDATE "${table}" AS t SET "branchId" = b."id" FROM "branches" b WHERE b."businessId" = t."businessId" AND b."isDefault" = true`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_${table}_business_branch_createdAt" ON "${table}" ("businessId", "branchId", "createdAt")`,
      );
    }

    await queryRunner.query(`ALTER TABLE "products" ADD "barcode" character varying`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_products_business_barcode" ON "products" ("businessId", "barcode") WHERE "barcode" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_products_business_barcode"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "barcode"`);

    for (const table of ['expenses', 'sales']) {
      await queryRunner.query(`DROP INDEX "IDX_${table}_business_branch_createdAt"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_branch"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "branchId"`);
    }

    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_branch"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "branchId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);

    await queryRunner.query(`DROP TABLE "branches"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
