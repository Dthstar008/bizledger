#!/usr/bin/env node
/*
 * Backs up BizLedger's data with pg_dump:  npm run db:backup
 *
 * - Only BizLedger's own tables: the database is shared with an unrelated
 *   project, so a whole-schema dump would copy someone else's data too.
 * - Data only: the schema comes from the versioned migrations. To restore,
 *   run the migrations on an empty database, then load this file (see the
 *   README, "Backups").
 * - Writes <BACKUP_DIR or backend/backups>/bizledger-<UTC time>.dump plus a
 *   .json manifest with row counts, the applied migrations and a SHA-256.
 *
 * The dump contains personal data and password hashes. Keep it off the repo
 * (backups/ is git-ignored) and store copies somewhere private and encrypted.
 */
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

// Parents before children, so a data-only restore satisfies foreign keys.
const TABLES = [
  'businesses',
  'branches',
  'users',
  'password_resets',
  'products',
  'product_images',
  'customers',
  'sales',
  'sale_items',
  'transactions',
  'expenses',
  'ledger_events',
];

function findPgDump() {
  const exe = process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';
  if (process.env.PG_BIN) return path.join(process.env.PG_BIN, exe);
  try {
    execFileSync(exe, ['--version'], { stdio: 'ignore' });
    return exe;
  } catch {
    // Not on PATH: look for a standard Windows install, newest first.
  }
  const root = 'C:\\Program Files\\PostgreSQL';
  if (process.platform === 'win32' && fs.existsSync(root)) {
    const versions = fs.readdirSync(root).filter((v) => /^\d+$/.test(v)).sort((a, b) => Number(b) - Number(a));
    for (const v of versions) {
      const candidate = path.join(root, v, 'bin', exe);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  throw new Error('pg_dump not found. Install the PostgreSQL client tools or set PG_BIN to their bin folder.');
}

async function main() {
  const db = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: process.env.DB_SSL === 'true',
  };
  if (!db.host || !db.user || !db.database) throw new Error('DB_HOST, DB_USERNAME and DB_DATABASE must be set (backend/.env).');

  const dir = path.resolve(process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups'));
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const file = path.join(dir, `bizledger-${stamp}.dump`);

  const pgDump = findPgDump();
  const args = ['--format=custom', '--data-only', '--no-owner', '--no-privileges', `--file=${file}`];
  for (const t of TABLES) args.push(`--table=public."${t}"`);
  execFileSync(pgDump, args, {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: {
      ...process.env,
      PGHOST: db.host,
      PGPORT: String(db.port),
      PGUSER: db.user,
      PGPASSWORD: db.password,
      PGDATABASE: db.database,
      PGSSLMODE: db.ssl ? 'require' : 'prefer',
    },
  });

  // Row counts and applied migrations, so a restore can be checked against them.
  const client = new Client({ ...db, ssl: db.ssl ? { rejectUnauthorized: false } : false });
  await client.connect();
  const rows = {};
  for (const t of TABLES) rows[t] = Number((await client.query(`SELECT COUNT(*) FROM "${t}"`)).rows[0].count);
  const migrations = (await client.query('SELECT name FROM migrations ORDER BY id')).rows.map((r) => r.name);
  await client.end();

  const bytes = fs.readFileSync(file);
  const manifest = {
    file: path.basename(file),
    createdAt: new Date().toISOString(),
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    pgDump: execFileSync(pgDump, ['--version']).toString().trim(),
    tables: rows,
    migrations,
  };
  fs.writeFileSync(file.replace(/\.dump$/, '.json'), JSON.stringify(manifest, null, 2));

  const total = Object.values(rows).reduce((a, b) => a + b, 0);
  console.log(`Backup written: ${file}`);
  console.log(`${(bytes.length / 1024).toFixed(0)} KB, ${total} rows across ${TABLES.length} tables, ${migrations.length} migrations applied.`);
}

main().catch((err) => {
  console.error(`Backup failed: ${err.message}`);
  process.exit(1);
});
