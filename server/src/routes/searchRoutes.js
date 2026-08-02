import express from 'express';
import SearchController from '../controllers/searchController.js';

const router = express.Router();

router.get('/jobs', (req, res) => SearchController.searchJobs(req, res));
router.get('/suggestions/jobs', (req, res) =>
  SearchController.getJobSuggestions(req, res)
);

export default router;
