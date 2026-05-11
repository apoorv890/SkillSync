import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import CandidateController from '../controllers/candidateController.js';
import candidateBulkResumeUpload, { handleUploadError } from '../middleware/upload.js';

const router = express.Router();

router.get('/job/:id', (req, res) =>
  CandidateController.getCandidatesByJob(req, res)
);
router.post(
  '/job/:id/upload',
  authenticate,
  requireAdmin,
  candidateBulkResumeUpload.array('resumes', 5),
  handleUploadError,
  (req, res) => CandidateController.uploadResumes(req, res)
);
router.post('/:id/schedule', authenticate, requireAdmin, (req, res) =>
  CandidateController.scheduleInterview(req, res)
);

export default router;

