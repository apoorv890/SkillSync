import rateLimit from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Rate limiter for authentication endpoints
 * Production: 5 / 15 min per IP. Development: effectively disabled
 * (1000 / 15 min) so registration/login flows are easy to iterate on.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 1000,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for password reset endpoints
 * Production: 3 / hour per IP. Development: 1000 / hour.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 3 : 1000,
  message: {
    success: false,
    error: 'Too many password reset attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
