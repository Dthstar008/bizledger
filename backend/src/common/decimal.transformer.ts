import { ValueTransformer } from 'typeorm';

/**
 * Postgres numeric columns come back as strings via pg driver.
 * Money is stored as decimal(14,2) Naira; this keeps reads/writes as JS numbers.
 */
export class DecimalTransformer implements ValueTransformer {
  to(value?: number): number | undefined {
    return value;
  }

  from(value?: string): number | undefined {
    if (value === null || value === undefined) return value as unknown as undefined;
    return parseFloat(value);
  }
}
