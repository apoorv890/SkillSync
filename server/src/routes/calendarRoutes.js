import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import CalendarController from '../controllers/calendarController.js';

const router = express.Router();

// Admin-only calendar connect.
router.get('/auth-url', authenticate, requireAdmin, CalendarController.authUrl);

// OAuth callback must be public (Google redirects here); state binds to admin user.
router.get('/oauth/callback', CalendarController.oauthCallback);

// Availability and scheduling are called by the phone-agent via SkillSync admin account.
router.get('/availability', authenticate, requireAdmin, CalendarController.availability);
router.post('/schedule', authenticate, requireAdmin, CalendarController.schedule);

export default router;

