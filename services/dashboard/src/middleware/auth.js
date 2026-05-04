import mongoose from 'mongoose';
import { extractBearerToken, verifyToken } from '@skillsync/shared/jwt';
import * as authClient from '../services/authClient.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.header('Authorization'));

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const isBlacklisted = await authClient.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = verifyToken(token);

    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const row = await authClient.getUserById(decoded.userId);
    if (!row) {
      return res.status(401).json({ error: 'User not found' });
    }

    const oid = new mongoose.Types.ObjectId(String(row.id));
    req.user = {
      _id: oid,
      id: oid,
      userId: String(row.id),
      email: row.email,
      role: row.role,
      fullName: row.fullName,
      profilePhotoUrl: row.profilePhotoUrl
    };
    req.userId = oid;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
