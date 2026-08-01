import crypto from 'crypto';

export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    crypto.timingSafeEqual(aBuffer, aBuffer);
    return false;
  }

  try {
    return crypto.timingSafeEqual(aBuffer, bBuffer);
  } catch {
    return false;
  }
}
