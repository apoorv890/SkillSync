import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getUserProfile, updateUserProfile } from '../controllers/profileController.js';

const router = express.Router();

router.use(authenticate);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

export default router;
