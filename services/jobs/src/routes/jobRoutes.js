import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import JobController from '../controllers/JobController.js';
import { validateJobCreation, validateJobUpdate } from '../middleware/jobValidation.js';

const router = express.Router();

router.get('/', JobController.getAllJobs);
router.get('/search', JobController.searchJobs);
router.get('/:id', JobController.getJobById);

router.post('/', authenticate, requireAdmin, validateJobCreation, JobController.createJob);
router.put('/:id', authenticate, requireAdmin, validateJobUpdate, JobController.updateJob);
router.delete('/:id', authenticate, requireAdmin, JobController.deleteJob);

export default router;
