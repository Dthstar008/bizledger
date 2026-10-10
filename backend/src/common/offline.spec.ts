import { MAX_OFFLINE_AGE_MS, isUniqueViolation, resolveOccurredAt } from './offline';

describe('resolveOccurredAt', () => {
  const now = new Date('2026-10-09T12:00:00.000Z');

  it('uses the server time when the phone sent none', () => {
    expect(resolveOccurredAt(undefined, now)).toEqual(now);
  });

  it('keeps an offline sale on the time it was made', () => {
    expect(resolveOccurredAt('2026-10-09T08:15:00.000Z', now)).toEqual(new Date('2026-10-09T08:15:00.000Z'));
  });

  it('treats a phone clock slightly ahead as now, and a far-future time as untrusted', () => {
    expect(resolveOccurredAt('2026-10-09T12:02:00.000Z', now)).toEqual(now);
    expect(resolveOccurredAt('2027-01-01T00:00:00.000Z', now)).toEqual(now);
  });

  it('does not trust times older than the offline limit or unparseable values', () => {
    expect(resolveOccurredAt(new Date(now.getTime() - MAX_OFFLINE_AGE_MS - 1000).toISOString(), now)).toEqual(now);
    expect(resolveOccurredAt('not a date', now)).toEqual(now);
  });
});

describe('isUniqueViolation', () => {
  it('recognises Postgres unique violations, directly or wrapped by TypeORM', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ driverError: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation({ code: '23503' })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
