const TRANSIENT_CONNECTION_ERROR_PATTERNS = [
  /connection terminated/i,
  /timeout exceeded when trying to connect/i,
  /connect ETIMEDOUT/i,
  /connect ECONNREFUSED/i,
  /connect ENETUNREACH/i,
  /connection.*closed/i,
];

function isTransientConnectionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return TRANSIENT_CONNECTION_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Retries a function a few times if it fails with what looks like a
 * transient DB connection error — a flaky network dropping a connection
 * attempt — rather than a real application error (validation, business
 * rule, etc.), which is never retried.
 *
 * Only wrap work where a failure this matches means nothing was written:
 * a connection-establishment failure happens before any transaction opens,
 * and a connection dropped mid-transaction aborts it server-side (Postgres
 * rolls back automatically), so in both cases there's nothing partial to
 * double-apply by retrying the whole operation from scratch.
 */
export async function withConnectionRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 400): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransientConnectionError(err) || attempt === attempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }
  throw lastError;
}
