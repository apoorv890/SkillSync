import TokenService from '../services/TokenService.js';
import User from '../models/User.js';

// Middleware to verify JWT token
export const authenticate = async (req, res, next) => {
  try {
    const token = TokenService.extractTokenFromHeader(req.header('Authorization'));

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const isBlacklisted = await TokenService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = TokenService.verifyToken(token);

    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user is admin
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};


