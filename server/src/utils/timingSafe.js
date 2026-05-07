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

export function timingSafeHashEqual(hashA, hashB) {
  if (typeof hashA !== 'string' || typeof hashB !== 'string') {
    return false;
  }

  if (hashA.length !== hashB.length) {
    const dummy = Buffer.from(hashA, 'hex');
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }

  try {
    const aBuffer = Buffer.from(hashA, 'hex');
    const bBuffer = Buffer.from(hashB, 'hex');
    return crypto.timingSafeEqual(aBuffer, bBuffer);
  } catch {
    return false;
  }
}

export function timingSafeOtpCompare(inputOtp, storedHash) {
  if (!inputOtp || !storedHash) {
    crypto.createHash('sha256').update('').digest('hex');
    return false;
  }

  const inputHash = crypto.createHash('sha256').update(inputOtp).digest('hex');
  return timingSafeHashEqual(inputHash, storedHash);
}

