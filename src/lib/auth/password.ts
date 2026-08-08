import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const BCRYPT_SALT_ROUNDS = 12;

export const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGIT_CHARS = '0123456789';
const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{};\':"|,.<>/?';
const ALL_CHARS = LOWERCASE_CHARS + UPPERCASE_CHARS + DIGIT_CHARS + SPECIAL_CHARS;

/**
 * Returns a cryptographically secure random integer in the range [0, maxExclusive)
 * using rejection sampling to eliminate modulo bias.
 */
function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0 || maxExclusive > 256) {
    throw new Error('maxExclusive must be between 1 and 256');
  }

  const limit = 256 - (256 % maxExclusive);
  const randomBytes = Buffer.alloc(1);

  while (true) {
    crypto.randomFillSync(randomBytes);
    const value = randomBytes[0];
    if (value < limit) {
      return value % maxExclusive;
    }
  }
}

/**
 * Generates a temporary password with guaranteed complexity using rejection sampling.
 */
export function generateTempPassword(length = 14): string {
  if (length < 12) {
    length = 12;
  }

  // Ensure at least one character from each required class
  const chars: string[] = [
    LOWERCASE_CHARS[secureRandomInt(LOWERCASE_CHARS.length)],
    UPPERCASE_CHARS[secureRandomInt(UPPERCASE_CHARS.length)],
    DIGIT_CHARS[secureRandomInt(DIGIT_CHARS.length)],
    SPECIAL_CHARS[secureRandomInt(SPECIAL_CHARS.length)],
  ];

  // Fill remaining characters from ALL_CHARS pool using rejection sampling
  while (chars.length < length) {
    chars.push(ALL_CHARS[secureRandomInt(ALL_CHARS.length)]);
  }

  // Fisher-Yates shuffle using unbiased secure random integers
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  const result = chars.join('');

  // Defensive validation check
  if (!PASSWORD_COMPLEXITY_REGEX.test(result)) {
    // Highly unlikely fallback re-generation
    return generateTempPassword(length);
  }

  return result;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordComplexity(password: string): boolean {
  return PASSWORD_COMPLEXITY_REGEX.test(password);
}
