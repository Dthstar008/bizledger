import { passwordProblem } from './password-policy';
import { compareVersions } from './semver';

describe('passwordProblem', () => {
  it('accepts a password with letters and numbers of at least 8 characters', () => {
    expect(passwordProblem('shopkeeper24')).toBeNull();
    expect(passwordProblem('Lekki-branch-2026')).toBeNull();
  });

  it('rejects short passwords', () => {
    expect(passwordProblem('abc123')).toMatch(/at least 8/);
  });

  it('requires both a letter and a number', () => {
    expect(passwordProblem('onlyletters')).toMatch(/letter and one number/);
    expect(passwordProblem('1234567890123')).toMatch(/letter and one number/);
  });

  it('rejects common passwords, whatever the case', () => {
    expect(passwordProblem('password123')).toMatch(/too common/);
    expect(passwordProblem('Naija123')).toMatch(/too common/);
  });

  it('rejects a password containing the email name', () => {
    expect(passwordProblem('chidi2026x', { email: 'chidi@shop.ng' })).toMatch(/email/);
    expect(passwordProblem('chidi2026x', { email: 'ada@shop.ng' })).toBeNull();
  });

  it('rejects passwords bcrypt would silently truncate', () => {
    expect(passwordProblem('a1' + 'x'.repeat(80))).toMatch(/at most 72/);
  });
});

describe('compareVersions', () => {
  it('orders versions numerically, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.3')).toBeGreaterThan(0);
    expect(compareVersions('1.2.0', '1.2.0')).toBe(0);
    expect(compareVersions('1.1.9', '1.2.0')).toBeLessThan(0);
  });

  it('treats missing parts as 0 and a missing version as the oldest', () => {
    expect(compareVersions('2', '2.0.0')).toBe(0);
    expect(compareVersions(undefined, '0.0.1')).toBeLessThan(0);
    expect(compareVersions('garbage', '1.0.0')).toBeLessThan(0);
  });
});
