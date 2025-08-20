import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import ApplicationController from '../controllers/ApplicationController.js';
import upload, { handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// User routes
router.post(
  '/job/:jobId/apply', 
  authenticate, 
  upload.single('resume'),
  handleUploadError,
  ApplicationController.applyForJob
);

router.delete(
  '/job/:jobId/withdraw', 
  authenticate, 
  ApplicationController.withdrawApplication
);

router.get(
  '/job/:jobId/status', 
  authenticate, 
  ApplicationController.getApplicationStatus
);

router.get(
  '/my-applications', 
  authenticate, 
  ApplicationController.getUserApplications
);

// Admin routes
router.get(
  '/job/:jobId/all', 
  authenticate, 
  requireAdmin, 
  ApplicationController.getJobApplications
);

router.get(
  '/resume/:applicationId', 
  authenticate, 
  requireAdmin, 
  ApplicationController.getResumeUrl
);

router.post(
  '/:applicationId/retry-analysis',
  authenticate,
  requireAdmin,
  ApplicationController.retryATSAnalysis
);

router.get(
  '/:applicationId/ats-status',
  authenticate,
  requireAdmin,
  ApplicationController.getATSStatus
);

router.patch(
  '/:applicationId/status',
  authenticate,
  requireAdmin,
  ApplicationController.updateApplicationStatus
);

export default router;
