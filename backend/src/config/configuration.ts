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
    // Supabase's free session pooler allows 15 connections across every client, and
    // more than one API instance can share it; queries beyond the pool queue instead of failing.
    poolMax: parseInt(process.env.DB_POOL_MAX || '5', 10),
    connectTimeoutMs: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  corsOrigins: process.env.CORS_ORIGINS,
  // Hops of reverse proxy in front of the API (Render has one), so rate
  // limiting sees each client's real IP instead of the proxy's.
  trustProxy: parseInt(process.env.TRUST_PROXY || (isProduction ? '1' : '0'), 10),
  rateLimit: {
    // Generous per-IP ceiling: many phones can share one carrier IP.
    perMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '600', 10),
  },
  // Minimum-supported and latest app versions. Unset = no update is ever
  // required or suggested; set MIN_APP_VERSION to retire older apps.
  app: {
    minVersion: process.env.MIN_APP_VERSION || null,
    latestVersion: process.env.LATEST_APP_VERSION || null,
    updateUrl: process.env.APP_UPDATE_URL || null,
  },
  // Outgoing email (password reset codes). Any SMTP provider works; without
  // SMTP_HOST, development logs codes to the console and production says
  // email reset isn't available.
  mail: {
    host: process.env.SMTP_HOST || null,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.MAIL_FROM || process.env.SMTP_USER || null,
  },
  // Details shown in the Privacy Policy and Terms; placeholders until set.
  legal: {
    entityName: process.env.LEGAL_ENTITY_NAME || null,
    address: process.env.LEGAL_ADDRESS || null,
    email: process.env.LEGAL_CONTACT_EMAIL || null,
    // Set to true once a lawyer has reviewed the documents; removes the draft banner.
    reviewed: process.env.LEGAL_REVIEWED === 'true',
  },
  isProduction,
});
