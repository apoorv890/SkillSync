import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { 
  validateRegistration, 
  validateLogin, 
  validatePasswordReset,
  validateOTPVerification 
} from '../middleware/validation.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import TokenService from '../services/TokenService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Environment variables - lazy validation (check when used, not at module load)
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
  }
  return secret;
};

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Register a new user
router.post('/register', authLimiter, validateRegistration, async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user - role is always 'user', never from request body
    const user = new User({
      fullName,
      email,
      password,
      role: 'user' // Always 'user' - role cannot be set during registration
    });

    await user.save();

    // Generate token pair (access + refresh)
    const { accessToken, refreshToken } = TokenService.generateTokenPair({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePhotoUrl: user.profilePhotoUrl || null
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login user
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token pair (access + refresh)
    const { accessToken, refreshToken } = TokenService.generateTokenPair({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePhotoUrl: user.profilePhotoUrl || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, getJWTSecret());
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Logout - Blacklist token
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = TokenService.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      await TokenService.blacklistToken(token, req.user.userId, 'logout');
    }

    res.status(200).json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

// Get current user (protected route)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP before storing (security best practice)
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    
    // Set hashed OTP and expiration (10 minutes)
    user.resetPasswordOTP = hashedOTP;
    user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // TODO: Send OTP via email (for now, log it to console)
    console.log(`OTP for ${email}: ${otp}`);
    
    res.status(200).json({ 
      message: 'OTP sent to your email',
      // Remove this in production - only for testing
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', validateOTPVerification, async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash provided OTP and compare with stored hash
    const hashedInputOTP = crypto.createHash('sha256').update(otp).digest('hex');
    if (user.resetPasswordOTP !== hashedInputOTP) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.resetPasswordOTPExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', passwordResetLimiter, validatePasswordReset, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP again - hash provided OTP and compare
    const hashedInputOTP = crypto.createHash('sha256').update(otp).digest('hex');
    if (user.resetPasswordOTP !== hashedInputOTP) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.resetPasswordOTPExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
