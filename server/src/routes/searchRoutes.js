import express from 'express';
import SearchController from '../controllers/SearchController.js';

const router = express.Router();

router.get('/jobs', (req, res) => SearchController.searchJobs(req, res));
router.get('/candidates', (req, res) => SearchController.searchCandidates(req, res));
router.get('/unified', (req, res) => SearchController.unifiedSearch(req, res));
router.get('/suggestions/jobs', (req, res) => SearchController.getJobSuggestions(req, res));
router.get('/suggestions/candidates', (req, res) => SearchController.getCandidateSuggestions(req, res));

export default router;
