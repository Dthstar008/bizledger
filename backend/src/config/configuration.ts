const isProduction = process.env.NODE_ENV === 'production';

// A forgeable default JWT secret is fine for local dev but would let anyone
// mint valid tokens for any business if it ever shipped to production —
// refuse to boot rather than silently running with a known secret.
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET must be set in production — refusing to start with a forgeable default. ' +
      'Generate one with: openssl rand -base64 48',
  );
}

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_DATABASE || 'bizledger',
    ssl: process.env.DB_SSL === 'true',
    poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
    connectTimeoutMs: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  corsOrigins: process.env.CORS_ORIGINS,
});
