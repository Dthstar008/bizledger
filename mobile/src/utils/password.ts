// Mirrors the server's password rule (backend/src/common/password-policy.ts)
// so people see what's needed while typing. The server remains the authority.
export const PASSWORD_MIN_LENGTH = 8;

const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', 'passw0rd', 'p@ssw0rd', 'p@ssword1',
  '12345678', '123456789', '1234567890', '12345678910', '87654321', '11111111', '00000000', '11223344', '12341234',
  'qwerty12', 'qwerty123', 'qwertyuiop', 'qwerty1234', 'asdfghjk', 'asdf1234', 'zxcvbnm1', '1q2w3e4r', '1qaz2wsx',
  'iloveyou', 'iloveyou1', 'abc12345', 'abcd1234', 'abcdefg1', 'admin123', 'admin1234', 'welcome1', 'welcome123',
  'letmein1', 'monkey123', 'dragon123', 'football1', 'sunshine1', 'princess1', 'baseball1', 'superman1', 'trustno1',
  'changeme', 'changeme1', 'test1234', 'secret123', 'master123', 'loveyou1', 'jesus123', 'jesus1234', 'god12345',
  'blessed1', 'nigeria1', 'nigeria123', 'naija123', 'lagos123', 'abuja123', 'bizledger', 'bizledger1', 'bizledger123',
]);

export interface PasswordCheck {
  label: string;
  ok: boolean;
}

export function passwordChecks(password: string, email?: string): PasswordCheck[] {
  const lower = password.toLowerCase();
  const emailName = email?.split('@')[0]?.toLowerCase();
  return [
    { label: `At least ${PASSWORD_MIN_LENGTH} characters`, ok: password.length >= PASSWORD_MIN_LENGTH },
    { label: 'Includes a letter and a number', ok: /[A-Za-z]/.test(password) && /\d/.test(password) },
    {
      label: 'Not a common password or your email',
      ok: password.length > 0 && !COMMON.has(lower) && !(emailName && emailName.length >= 4 && lower.includes(emailName)),
    },
  ];
}

export const isStrongPassword = (password: string, email?: string) => passwordChecks(password, email).every((c) => c.ok);
