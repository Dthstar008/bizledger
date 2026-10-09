/**
 * Compares two "MAJOR.MINOR.PATCH" versions (pre-release suffixes are ignored).
 * Returns a negative number if a < b, 0 if equal, positive if a > b.
 * Anything unparseable counts as 0.0.0, so a missing version is always oldest.
 */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const parse = (v: string | null | undefined) => {
    const m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(v ?? '');
    return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : [0, 0, 0];
  };
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] - y[i];
  }
  return 0;
}

export const isValidVersion = (v: string | null | undefined) => /^\s*v?\d+(\.\d+){0,2}/.test(v ?? '');
