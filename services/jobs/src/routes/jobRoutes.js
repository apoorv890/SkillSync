import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import JobController from '../controllers/JobController.js';
import { validateJobCreation, validateJobUpdate } from '../middleware/jobValidation.js';
import csrfProtection from '../middleware/csrf.js';

const router = express.Router();

router.get('/', JobController.getAllJobs);
router.get('/search', JobController.searchJobs);
router.get('/:id', JobController.getJobById);

router.post('/', authenticate, requireAdmin, csrfProtection, validateJobCreation, JobController.createJob);
router.put('/:id', authenticate, requireAdmin, csrfProtection, validateJobUpdate, JobController.updateJob);
router.delete('/:id', authenticate, requireAdmin, csrfProtection, JobController.deleteJob);

export default router;
