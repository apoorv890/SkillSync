import { timingSafeEqual } from '../security/timingSafe.js';

/**
 * Validates X-Internal-Token against INTERNAL_SERVICE_TOKEN (constant-time).
 */
export function requireInternal(req, res, next) {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (!expected) {
    return res.status(503).json({ success: false, message: 'Internal service token not configured' });
  }
  const got = req.headers['x-internal-token'];
  if (!got || typeof got !== 'string') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  if (got.length !== expected.length) {
    timingSafeEqual(got, got);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  if (!timingSafeEqual(got, expected)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}
