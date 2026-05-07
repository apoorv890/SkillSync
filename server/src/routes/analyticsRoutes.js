import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAnalytics } from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/', authenticate, getAnalytics);

export default router;

