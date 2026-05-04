import express from 'express';
import mongoose from 'mongoose';
import { requireInternal } from '@skillsync/shared/middleware';
import Application from '../models/Application.js';
import * as internalRead from '../services/internalReadService.js';

const router = express.Router();

router.use(requireInternal);

router.get('/applications/:id/for-worker', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid application id' });
    }
    const application = await Application.findById(id).lean();
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    return res.json(application);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/applications/:id/ats', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid application id' });
    }
    const application = await Application.findById(id).select('atsScore').lean();
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const a = application.atsScore || {};
    return res.json({
      status: a.status || 'pending',
      score: a.score ?? null,
      analyzedAt: a.analyzedAt || null,
      error: a.error || null
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/applications/:id/ats/reset-retry', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid application id' });
    }
    await Application.findByIdAndUpdate(id, {
      'atsScore.status': 'pending',
      'atsScore.error': null
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/applications/:id/ats/processing', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid application id' });
    }
    await Application.findByIdAndUpdate(id, {
      'atsScore.status': 'processing',
      'atsScore.error': null
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/applications/:id/ats/complete', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid application id' });
    }
    const { score, breakdown, matchSummary, candidateInfo } = req.body || {};
    const update = {
      'atsScore.score': score,
      'atsScore.breakdown': breakdown,
      'atsScore.matchSummary': matchSummary,
      'atsScore.analyzedAt': new Date(),
      'atsScore.status': 'completed',
      'atsScore.error': null
    };
    if (candidateInfo) {
      update.candidateInfo = candidateInfo;
    }
    await Application.findByIdAndUpdate(id, update);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/applications/:id/ats/failed', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid application id' });
    }
    const { error: errMsg } = req.body || {};
    await Application.findByIdAndUpdate(id, {
      'atsScore.status': 'failed',
      'atsScore.error': errMsg || 'Unknown error'
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/user-applications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const payload = await internalRead.getUserDashboardApplicationStats(userId);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/admin-candidate-counts', async (_req, res) => {
  try {
    const payload = await internalRead.getAdminCandidateCounts();
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/user-candidate-mock', async (_req, res) => {
  try {
    const payload = await internalRead.getLegacyUserDashboardCandidateMock();
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/search/candidates-filtered', async (req, res) => {
  try {
    const candidates = await internalRead.searchCandidatesFiltered(req.body || {});
    return res.json({ candidates });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/search/unified-candidates', async (req, res) => {
  try {
    const { sanitizedQuery } = req.body || {};
    if (!sanitizedQuery || typeof sanitizedQuery !== 'string') {
      return res.status(400).json({ error: 'sanitizedQuery is required' });
    }
    const candidates = await internalRead.unifiedSearchCandidatesPart(sanitizedQuery);
    return res.json({ candidates });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/search/candidate-suggestions', async (req, res) => {
  try {
    const suggestions = await internalRead.getCandidateSuggestionsInternal(
      req.query.prefix,
      req.query.jobId
    );
    return res.json({ suggestions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
