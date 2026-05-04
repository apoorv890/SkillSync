import express from 'express';
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

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SkillSync Backend is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
