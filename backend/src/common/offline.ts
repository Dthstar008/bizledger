/**
 * Helpers for records the app saved on the phone while offline and sent
 * later (see migration OfflineSync1790400000000).
 */

/** How far back an offline record's own timestamp is trusted. Older claims are recorded at the time they arrive. */
export const MAX_OFFLINE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Phones' clocks drift a little; a time slightly ahead of the server is treated as "now". */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * When the record actually happened. A sale made offline at 10:00 and synced
 * at 14:00 belongs to 10:00 in the day's reports. The phone's clock is only
 * trusted within sensible bounds: never in the future, never more than 30
 * days back. Outside those, the server's own time is used.
 */
export function resolveOccurredAt(occurredAt: string | undefined, now: Date = new Date()): Date {
  if (!occurredAt) return now;
  const t = Date.parse(occurredAt);
  if (Number.isNaN(t)) return now;
  if (t > now.getTime() + CLOCK_SKEW_MS) return now;
  if (t < now.getTime() - MAX_OFFLINE_AGE_MS) return now;
  return new Date(Math.min(t, now.getTime()));
}

/** Postgres unique_violation, e.g. a second insert with the same clientRef racing the first. */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; driverError?: { code?: string } } | null;
  return e?.code === '23505' || e?.driverError?.code === '23505';
}
