import express from 'express';
import { requireInternal } from '@skillsync/shared/middleware';
import ResumeAnalysisService from '../services/ResumeAnalysisService.js';

const router = express.Router();

router.use(requireInternal);

router.post('/analyze', async (req, res) => {
  try {
    const { applicationId } = req.body || {};
    if (!applicationId || typeof applicationId !== 'string') {
      return res.status(400).json({ success: false, message: 'applicationId is required' });
    }
    const score = await ResumeAnalysisService.analyzeResume(applicationId, null);
    return res.json({ success: true, score });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Analysis failed'
    });
  }
});

router.post('/analyze/retry', async (req, res) => {
  try {
    const { applicationId } = req.body || {};
    if (!applicationId || typeof applicationId !== 'string') {
      return res.status(400).json({ success: false, message: 'applicationId is required' });
    }
    const score = await ResumeAnalysisService.retryAnalysis(applicationId);
    return res.json({ success: true, score });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Retry failed'
    });
  }
});

export default router;
