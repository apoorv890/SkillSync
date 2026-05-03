import express from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import { requireInternal } from '@skillsync/shared/middleware';
import * as jobReads from '../services/jobInternalReadService.js';

const router = express.Router();

router.use(requireInternal);

router.post('/jobs/by-ids', async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    if (ids.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 ids' });
    }
    const invalid = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length) {
      return res.status(400).json({ error: 'Invalid job id in list' });
    }
    const jobs = await Job.find({ _id: { $in: ids } }).lean();
    return res.json({ jobs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/jobs/dashboard-stats', async (_req, res) => {
  try {
    const payload = await jobReads.getAdminDashboardJobPayload();
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/jobs/analytics/timeseries', async (req, res) => {
  try {
    const range = req.query.range || '90d';
    const payload = await jobReads.getJobsAnalyticsPayload(range);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/jobs/search/filtered', async (req, res) => {
  try {
    const jobs = await jobReads.searchJobsWithFilters(req.body || {});
    return res.json({ jobs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/jobs/search/unified', async (req, res) => {
  try {
    const { query } = req.body || {};
    const jobs = await jobReads.unifiedSearchJobsOnly(query);
    return res.json({ jobs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/jobs/search/suggestions', async (req, res) => {
  try {
    const suggestions = await jobReads.getJobSuggestions(req.query.prefix);
    return res.json({ suggestions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid job id' });
    }
    const job = await Job.findById(id).lean();
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.json(job);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
