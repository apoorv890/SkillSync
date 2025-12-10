import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import JobController from '../controllers/JobController.js';

const router = express.Router();

// Public routes
router.get('/', JobController.getAllJobs);
router.get('/search', JobController.searchJobs);
router.get('/:id', JobController.getJobById);

// Admin routes
router.post('/', authenticate, requireAdmin, JobController.createJob);
router.put('/:id', authenticate, requireAdmin, JobController.updateJob);
router.delete('/:id', authenticate, requireAdmin, JobController.deleteJob);

export default router;
