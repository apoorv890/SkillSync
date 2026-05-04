import express from 'express';
import User from '../models/User.js';
import TokenService from '../services/TokenService.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { postGoogleAuth, postOnboarding } from '../controllers/googleAuthController.js';

const router = express.Router();

router.post('/google', authLimiter, postGoogleAuth);
router.post('/onboarding', authLimiter, postOnboarding);

router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = TokenService.extractTokenFromHeader(req.headers.authorization);
    if (token) {
      await TokenService.blacklistToken(token, String(req.userId), 'logout');
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
