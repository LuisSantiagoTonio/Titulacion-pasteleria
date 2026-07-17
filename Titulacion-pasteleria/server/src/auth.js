import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PASSWORD_PREFIX = 'scrypt';

export function hashPassword(password) {
  const normalized = String(password || '');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(normalized, salt, 64).toString('hex');
  return `${PASSWORD_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password, storedHash) {
  try {
    const [prefix, salt, expectedHex] = String(storedHash || '').split('$');
    if (prefix !== PASSWORD_PREFIX || !salt || !expectedHex) return false;

    const actual = scryptSync(String(password || ''), salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex');
}
