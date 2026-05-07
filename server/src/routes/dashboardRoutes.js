import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAdminDashboard,
  getDashboardStats,
  getUserDashboard,
  getUserStats
} from '../controllers/dashboardController.js';

const router = express.Router();

/**
 * Compact stats for the candidate user-dashboard page (legacy path).
 */
router.get('/user-stats', authenticate, getUserStats);

router.get('/stats', authenticate, getDashboardStats);

router.get('/admin', getAdminDashboard);
router.get('/user', getUserDashboard);

export default router;

