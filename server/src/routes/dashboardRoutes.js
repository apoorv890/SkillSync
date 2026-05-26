import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getDashboardStats,
  getUserStats
} from '../controllers/dashboardController.js';

const router = express.Router();

/**
 * Compact stats for the candidate user-dashboard page (legacy path).
 */
router.get('/user-stats', authenticate, getUserStats);

router.get('/stats', authenticate, getDashboardStats);

export default router;

