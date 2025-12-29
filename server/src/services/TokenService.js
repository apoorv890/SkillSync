/**
 * Token Service
 * Handles JWT token generation, validation, blacklisting, and refresh tokens
 */

import jwt from 'jsonwebtoken';
import TokenBlacklist from '../models/TokenBlacklist.js';
import logger from '../config/logger.js';

// Function to get JWT_SECRET, ensuring it's set
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
  }
  return secret;
};

// Token expiration times
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'; // Long-lived refresh token

class TokenService {
  /**
   * Generate access token (short-lived)
   * @param {Object} payload - Token payload (userId, email, role)
   * @returns {string} JWT access token
   */
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

  /**
   * Generate refresh token (long-lived)
   * @param {Object} payload - Token payload (userId, email, role)
   * @returns {string} JWT refresh token
   */
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

  /**
   * Generate both access and refresh tokens
   * @param {Object} payload - Token payload
   * @returns {Object} Object containing accessToken and refreshToken
   */
  generateTokenPair(payload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, getJWTSecret());
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Check if token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {Promise<boolean>} True if token is blacklisted
   */
  async isTokenBlacklisted(token) {
    try {
      return await TokenBlacklist.isBlacklisted(token);
    } catch (error) {
      logger.error(`Error checking token blacklist: ${error.message}`);
      // Fail open - if we can't check, allow the token (but log the error)
      return false;
    }
  }

  /**
   * Blacklist a token
   * @param {string} token - JWT token to blacklist
   * @param {string} userId - User ID associated with token
   * @param {string} reason - Reason for blacklisting (logout, revoked, security)
   * @returns {Promise<void>}
   */
  async blacklistToken(token, userId, reason = 'logout') {
    try {
      // Decode token to get expiration
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        logger.warn('Cannot blacklist token: invalid token format');
        return;
      }

      // Convert expiration timestamp to Date
      const expiresAt = new Date(decoded.exp * 1000);

      await TokenBlacklist.blacklistToken(token, userId, expiresAt, reason);
      logger.info(`Token blacklisted for user ${userId}`, { reason });
    } catch (error) {
      logger.error(`Error blacklisting token: ${error.message}`);
      // Don't throw - blacklisting is best effort
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Extracted token or null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.replace('Bearer ', '');
  }

  /**
   * Get token expiration date
   * @param {string} token - JWT token
   * @returns {Date|null} Expiration date or null
   */
  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return null;
      }
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New access token and optionally new refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new Error('Refresh token has been revoked');
      }

      // Generate new access token
      const newAccessToken = this.generateAccessToken({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      });

      return {
        accessToken: newAccessToken,
        refreshToken: refreshToken // Reuse refresh token (or rotate if needed)
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }
}

export default new TokenService();
