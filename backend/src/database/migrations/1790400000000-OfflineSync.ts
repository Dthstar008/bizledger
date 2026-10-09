import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Offline sync for release 1.3:
 *
 * The app now saves sales and expenses on the phone when there is no
 * connection and sends them later. Each one carries a `clientRef` (a UUID
 * made on the phone when it was recorded), so a record that is sent twice
 * (a retry after a dropped connection, or the app syncing again after the
 * server already saved it) is only ever stored once.
 *
 * The unique indexes are partial: records created without a clientRef (older
 * app versions, the API directly) are unaffected.
 *
 * Purely additive; `down()` removes exactly what `up()` adds.
 */
export class OfflineSync1790400000000 implements MigrationInterface {
  name = 'OfflineSync1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sales" ADD "clientRef" uuid`);
    await queryRunner.query(`ALTER TABLE "expenses" ADD "clientRef" uuid`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sales_business_clientRef" ON "sales" ("businessId", "clientRef") WHERE "clientRef" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_expenses_business_clientRef" ON "expenses" ("businessId", "clientRef") WHERE "clientRef" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_expenses_business_clientRef"`);
    await queryRunner.query(`DROP INDEX "UQ_sales_business_clientRef"`);
    await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "clientRef"`);
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "clientRef"`);
  }
}
