import { MigrationInterface, QueryRunner } from 'typeorm';

const NEW_EVENT_TYPES = [
  'PRODUCT_UPDATED',
  'PRODUCT_DELETED',
  'CUSTOMER_CREATED',
  'CUSTOMER_UPDATED',
  'CUSTOMER_DELETED',
  'EXPENSE_UPDATED',
  'EXPENSE_DELETED',
];

/**
 * Product photos, plus the ledger event types needed so that every write
 * (edits and deletes included) is recorded as an event.
 *
 * - Photos live in their own `product_images` table, one per product, so
 *   product list queries never load image bytes. `products.imageUpdatedAt`
 *   says whether a product has a photo and doubles as a client cache-buster.
 * - Expression indexes on the ledger's entity ids keep per-product and
 *   per-customer activity timelines fast as the log grows.
 * - Postgres can't drop enum values, so `down()` leaves the added event
 *   types in place (harmless: nothing references them after a rollback).
 */
export class ProductImagesAndRecordEdits1790200000000 implements MigrationInterface {
  name = 'ProductImagesAndRecordEdits1790200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "product_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "productId" uuid NOT NULL,
        "businessId" uuid NOT NULL,
        "mimeType" character varying NOT NULL,
        "data" bytea NOT NULL,
        "size" integer NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_images" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_product_images_product" UNIQUE ("productId"),
        CONSTRAINT "FK_product_images_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_product_images_business" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "products" ADD "imageUpdatedAt" TIMESTAMP WITH TIME ZONE`);

    for (const type of NEW_EVENT_TYPES) {
      await queryRunner.query(`ALTER TYPE "ledger_events_type_enum" ADD VALUE IF NOT EXISTS '${type}'`);
    }

    await queryRunner.query(
      `CREATE INDEX "IDX_ledger_events_business_product" ON "ledger_events" ("businessId", ((metadata->>'productId')))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ledger_events_business_customer" ON "ledger_events" ("businessId", ((metadata->>'customerId')))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ledger_events_business_sale" ON "ledger_events" ("businessId", ((metadata->>'saleId')))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_ledger_events_business_sale"`);
    await queryRunner.query(`DROP INDEX "IDX_ledger_events_business_customer"`);
    await queryRunner.query(`DROP INDEX "IDX_ledger_events_business_product"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "imageUpdatedAt"`);
    await queryRunner.query(`DROP TABLE "product_images"`);
  }
}
