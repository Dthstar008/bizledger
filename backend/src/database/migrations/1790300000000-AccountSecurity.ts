import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Account security for release 1.2:
 *
 * - `users.tokenVersion` / `passwordChangedAt`: a password change or reset
 *   bumps the version, which invalidates every token issued before it.
 * - `users.failedLoginCount` / `lockedUntil`: a short lockout after repeated
 *   failed sign-ins, on top of per-IP rate limiting.
 * - `users.termsAcceptedAt` / `termsVersion`: an honest record of consent to
 *   the Terms and Privacy Policy (null for earlier accounts, never backfilled).
 * - `password_resets`: one-time, short-lived codes for "forgot password";
 *   only a keyed hash of each code is stored. RLS is enabled like every other
 *   table, so Supabase's public REST API can't read it.
 *
 * Purely additive; `down()` removes exactly what `up()` adds.
 */
export class AccountSecurity1790300000000 implements MigrationInterface {
  name = 'AccountSecurity1790300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "tokenVersion" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "users" ADD "passwordChangedAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "users" ADD "failedLoginCount" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "users" ADD "lockedUntil" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "users" ADD "termsAcceptedAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "users" ADD "termsVersion" character varying`);

    await queryRunner.query(`
      CREATE TABLE "password_resets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "codeHash" character varying NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "usedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_resets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_resets_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_password_resets_user_created" ON "password_resets" ("userId", "createdAt")`);
    await queryRunner.query(`ALTER TABLE "password_resets" ENABLE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "password_resets"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "termsVersion"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "termsAcceptedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lockedUntil"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "failedLoginCount"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordChangedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tokenVersion"`);
  }
}
