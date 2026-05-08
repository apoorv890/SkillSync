import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import PhoneController from '../controllers/phoneController.js';

const router = express.Router();

router.post('/call', authenticate, requireAdmin, PhoneController.callCandidate);

export default router;

