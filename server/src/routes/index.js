import express from 'express';
import dashboardRoutes from './dashboardRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import { getCsrfToken } from '../middleware/csrf.js';

const router = express.Router();

// CSRF token endpoint - must be before CSRF protection
router.get('/csrf-token', getCsrfToken, (req, res) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken()
  });
});

// Mount all routes
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SkillSync Backend is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
