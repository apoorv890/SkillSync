import jwt from 'jsonwebtoken';
import TokenBlacklist from '../models/TokenBlacklist.js';
import logger from '../utils/logger.js';

function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
  }
  return secret;
}

/**
 * Token Service
 * Handles JWT token generation, validation, blacklisting, and refresh tokens
 */
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

function verifyToken(token) {
  try {
    return jwt.verify(token, getJWTSecret());
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

class TokenService {
  generateAccessToken(payload) {
    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        type: 'access'
      },
      getJWTSecret(),
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  generateRefreshToken(payload) {
    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        type: 'refresh'
      },
      getJWTSecret(),
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
  }

  generateTokenPair(payload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  verifyToken(token) {
    return verifyToken(token);
  }

  async isTokenBlacklisted(token) {
    try {
      return await TokenBlacklist.isBlacklisted(token);
    } catch (error) {
      logger.error(`Error checking token blacklist: ${error.message}`);
      return false;
    }
  }

  async blacklistToken(token, userId, reason = 'logout') {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        logger.warn('Cannot blacklist token: invalid token format');
        return;
      }

      const expiresAt = new Date(decoded.exp * 1000);

      await TokenBlacklist.blacklistToken(token, userId, expiresAt, reason);
      logger.info(`Token blacklisted for user ${userId}`, { reason });
    } catch (error) {
      logger.error(`Error blacklisting token: ${error.message}`);
    }
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.replace('Bearer ', '');
  }

  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return null;
      }
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new Error('Refresh token has been revoked');
      }

      const newAccessToken = this.generateAccessToken({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      });

      return {
        accessToken: newAccessToken,
        refreshToken: refreshToken
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }
}

export default new TokenService();

