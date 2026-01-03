/**
 * Timing-Safe Comparison Utilities
 * Prevents timing attacks by using constant-time comparison
 */

import crypto from 'crypto';

/**
 * Constant-time string comparison
 * Uses crypto.timingSafeEqual for secure comparison
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  // Convert strings to buffers
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  // If lengths differ, return false immediately (but still compare to prevent timing leak)
  if (aBuffer.length !== bBuffer.length) {
    // Still do a comparison to maintain constant time
    crypto.timingSafeEqual(aBuffer, aBuffer);
    return false;
  }

  // Use Node.js built-in timing-safe comparison
  try {
    return crypto.timingSafeEqual(aBuffer, bBuffer);
  } catch (error) {
    // Fallback if timingSafeEqual fails (shouldn't happen)
    return false;
  }
}

/**
 * Constant-time comparison for hashed values (hex strings)
 * @param {string} hashA - First hash (hex string)
 * @param {string} hashB - Second hash (hex string)
 * @returns {boolean} True if hashes are equal
 */
export function timingSafeHashEqual(hashA, hashB) {
  if (typeof hashA !== 'string' || typeof hashB !== 'string') {
    return false;
  }

  // Hashes should be hex strings of equal length
  if (hashA.length !== hashB.length) {
    // Still compare to prevent timing leak
    const dummy = Buffer.from(hashA, 'hex');
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }

  try {
    const aBuffer = Buffer.from(hashA, 'hex');
    const bBuffer = Buffer.from(hashB, 'hex');
    return crypto.timingSafeEqual(aBuffer, bBuffer);
  } catch (error) {
    // Invalid hex strings
    return false;
  }
}

/**
 * Constant-time comparison for OTP values
 * Compares hashed OTPs in constant time
 * @param {string} inputOtp - User-provided OTP
 * @param {string} storedHash - Stored hashed OTP
 * @returns {boolean} True if OTP matches
 */
export function timingSafeOtpCompare(inputOtp, storedHash) {
  if (!inputOtp || !storedHash) {
    // Still hash to prevent timing leak
    crypto.createHash('sha256').update('').digest('hex');
    return false;
  }

  // Hash the input OTP
  const inputHash = crypto.createHash('sha256').update(inputOtp).digest('hex');
  
  // Compare hashes in constant time
  return timingSafeHashEqual(inputHash, storedHash);
}
