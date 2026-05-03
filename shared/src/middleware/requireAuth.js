import { verifyToken, extractBearerToken } from '../jwt/verify.js';

/**
 * JWT-only auth for microservices (no DB user load, no blacklist).
 * Sets req.user with _id/id/userId for compatibility with existing controllers.
 */
export async function authenticateJwtOnly(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);

    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const id = decoded.userId;
    req.user = {
      _id: id,
      id,
      userId: id,
      email: decoded.email,
      role: decoded.role
    };
    req.userId = id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
