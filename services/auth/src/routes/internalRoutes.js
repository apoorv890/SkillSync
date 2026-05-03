import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
import { requireInternal } from '@skillsync/shared/middleware';

const router = express.Router();

router.use(requireInternal);

router.post('/blacklist/check', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ blacklisted: false });
    }
    const blacklisted = await TokenBlacklist.isBlacklisted(token);
    return res.json({ blacklisted });
  } catch (error) {
    return res.status(500).json({ blacklisted: false, error: error.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const user = await User.findById(id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      profilePhotoUrl: user.profilePhotoUrl || null,
      profilePhotoKey: user.profilePhotoKey || null,
      createdAt: user.createdAt
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
