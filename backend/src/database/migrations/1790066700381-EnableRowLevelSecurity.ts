import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enables Row Level Security on this app's 9 owned tables, with no
 * policies attached. This app never uses Supabase's PostgREST/anon-key
 * surface — the backend connects directly as the table-owning role
 * (`postgres.<ref>`), which bypasses RLS regardless of this setting — so
 * enabling RLS here has no effect on the running app. It only closes the
 * Supabase security-advisor warning that every project's public-schema
 * tables are otherwise readable/writable by anyone holding the anon key
 * via the auto-generated REST API, which this app doesn't use but Supabase
 * exposes by default anyway.
 *
 * Deliberately not enabling `FORCE ROW LEVEL SECURITY` — that would also
 * bind the owning role, and this app has no policies or session-variable
 * wiring (e.g. `SET LOCAL app.business_id`) to support that; doing so
 * would return zero rows for every query the backend makes.
 */
export class EnableRowLevelSecurity1790066700381 implements MigrationInterface {
  name = 'EnableRowLevelSecurity1790066700381';

  private readonly tables = [
    'businesses',
    'users',
    'customers',
    'products',
    'sales',
    'sale_items',
    'expenses',
    'transactions',
    'ledger_events',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
  }
}
