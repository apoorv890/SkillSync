import express from 'express';
import authRoutes from './authRoutes.js';
import jobRoutes from './jobRoutes.js';
import applicationRoutes from './applicationRoutes.js';
import candidateRoutes from './candidateRoutes.js';
import searchRoutes from './searchRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import profileRoutes from './profileRoutes.js';
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
router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/candidates', candidateRoutes);
router.use('/search', searchRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/users', profileRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SkillSync Backend is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
