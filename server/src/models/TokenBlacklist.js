import mongoose from 'mongoose';

/**
 * TokenBlacklist Schema
 * Stores blacklisted JWT tokens until they expire
 */
const TokenBlacklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 } // Auto-delete expired tokens
    },
    blacklistedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      enum: ['logout', 'revoked', 'security'],
      default: 'logout'
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient lookups
TokenBlacklistSchema.index({ token: 1, userId: 1 });

// Static method to check if token is blacklisted
TokenBlacklistSchema.statics.isBlacklisted = async function (token) {
  const blacklisted = await this.findOne({ token });
  return !!blacklisted;
};

// Static method to blacklist a token
TokenBlacklistSchema.statics.blacklistToken = async function (
  token,
  userId,
  expiresAt,
  reason = 'logout'
) {
  try {
    await this.create({
      token,
      userId,
      expiresAt,
      reason
    });
  } catch (error) {
    // Ignore duplicate key errors (token already blacklisted)
    if (error.code !== 11000) {
      throw error;
    }
  }
};

// Static method to blacklist all tokens for a user
TokenBlacklistSchema.statics.blacklistUserTokens = async function (
  userId,
  reason = 'security'
) {
  // This is a placeholder - in practice, you'd need to track active tokens
  // For now, we'll rely on token expiration and individual blacklisting
  return true;
};

// Static method to clean up expired tokens (manual cleanup if needed)
TokenBlacklistSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

const TokenBlacklist = mongoose.model('TokenBlacklist', TokenBlacklistSchema);

export default TokenBlacklist;

