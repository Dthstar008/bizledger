export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Parses a user-typed amount ("12,500" or "12500.50"); null if it isn't a number. */
export function parseAmount(v: string): number | null {
  const cleaned = v.replace(/[,\s₦]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseWholeNumber(v: string): number | null {
  const n = parseAmount(v);
  return n !== null && Number.isInteger(n) ? n : null;
}
