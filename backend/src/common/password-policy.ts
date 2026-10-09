import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt ignores everything past 72 bytes, so longer passwords would silently be truncated. */
export const PASSWORD_MAX_LENGTH = 72;

// The most common passwords seen in breach lists, plus local favourites. Not
// exhaustive; it stops the guesses an attacker would try first.
const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', 'passw0rd', 'p@ssw0rd', 'p@ssword1',
  '12345678', '123456789', '1234567890', '12345678910', '87654321', '11111111', '00000000', '11223344', '12341234',
  'qwerty12', 'qwerty123', 'qwertyuiop', 'qwerty1234', 'asdfghjk', 'asdf1234', 'zxcvbnm1', '1q2w3e4r', '1qaz2wsx',
  'iloveyou', 'iloveyou1', 'abc12345', 'abcd1234', 'abcdefg1', 'admin123', 'admin1234', 'welcome1', 'welcome123',
  'letmein1', 'monkey123', 'dragon123', 'football1', 'sunshine1', 'princess1', 'baseball1', 'superman1', 'trustno1',
  'changeme', 'changeme1', 'test1234', 'secret123', 'master123', 'loveyou1', 'jesus123', 'jesus1234', 'god12345',
  'blessed1', 'nigeria1', 'nigeria123', 'naija123', 'lagos123', 'abuja123', 'bizledger', 'bizledger1', 'bizledger123',
]);

/**
 * Why a password is not acceptable, as a sentence for the person choosing it,
 * or null if it is fine. Checked only when a password is set or changed, so
 * existing accounts keep signing in with their current password.
 */
export function passwordProblem(password: string, context: { email?: string; name?: string } = {}): string | null {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number';
  }
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) {
    return 'That password is too common. Choose something harder to guess';
  }
  const emailName = context.email?.split('@')[0]?.toLowerCase();
  if (emailName && emailName.length >= 4 && lower.includes(emailName)) {
    return 'Password must not contain your email address';
  }
  return null;
}

/**
 * class-validator decorator for passwordProblem(). Reads `email` (or the
 * given property) from the same DTO so a password can't simply be the email.
 */
export function IsStrongPassword(options?: ValidationOptions & { emailProperty?: string }) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const email = (args.object as Record<string, unknown>)[options?.emailProperty ?? 'email'];
          return passwordProblem(String(value ?? ''), { email: typeof email === 'string' ? email : undefined }) === null;
        },
        defaultMessage(args: ValidationArguments) {
          const email = (args.object as Record<string, unknown>)[options?.emailProperty ?? 'email'];
          return passwordProblem(String(args.value ?? ''), { email: typeof email === 'string' ? email : undefined }) ?? 'Invalid password';
        },
      },
    });
  };
}
