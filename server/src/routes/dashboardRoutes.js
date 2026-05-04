import express from 'express';
import * as jobsClient from '../services/jobsClient.js';
import * as applicationsClient from '../services/applicationsClient.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

function pickJobSummary(job) {
  if (!job) {
    return null;
  }
  return {
    _id: job._id,
    title: job.title,
    location: job.location,
    workType: job.workType,
    status: job.status,
    department: job.department
  };
}

function rawJobId(jobRef) {
  if (jobRef == null) {
    return '';
  }
  if (typeof jobRef === 'object' && jobRef._id != null) {
    return String(jobRef._id);
  }
  return String(jobRef);
}

async function attachJobsToApplications(apps) {
  const jobIds = [...new Set(apps.map((a) => rawJobId(a.jobId)).filter(Boolean))];
  const jobs = await jobsClient.getJobsByIds(jobIds);
  const map = new Map(jobs.map((j) => [String(j._id), j]));
  return apps.map((a) => ({
    ...a,
    jobId: pickJobSummary(map.get(String(a.jobId))) || a.jobId
  }));
}

async function attachJobsToCandidates(rows) {
  const jobIds = [...new Set(rows.map((c) => rawJobId(c.jobId)).filter(Boolean))];
  const jobs = await jobsClient.getJobsByIds(jobIds);
  const map = new Map(jobs.map((j) => [String(j._id), j]));
  return rows.map((c) => ({
    ...c,
    jobId: pickJobSummary(map.get(String(c.jobId))) || c.jobId
  }));
}

router.get('/stats', authenticate, async (req, res) => {
  try {
    const userRole = req.user?.role;

    if (userRole === 'admin') {
      const {
        totalJobs,
        activeJobs,
        jobsByStatus,
        recentJobs
      } = await jobsClient.getAdminDashboardJobStats();
      const { totalCandidates, interviewsScheduled } =
        await applicationsClient.getAdminCandidateCounts();

      return res.json({
        totalJobs,
        activeJobs,
        totalCandidates,
        interviewsScheduled,
        jobsByStatus,
        recentJobs
      });
    }

    const userId = req.userId || req.user._id;

    const appStats = await applicationsClient.getUserDashboardApplicationStats(
      String(userId)
    );

    const recentApplications = await attachJobsToApplications(appStats.recentApplications);

    return res.json({
      ...appStats,
      recentApplications
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

router.get('/admin', async (req, res) => {
  try {
    const {
      totalJobs,
      activeJobs,
      jobsByStatus,
      recentJobs
    } = await jobsClient.getAdminDashboardJobStats();

    const { totalCandidates, interviewsScheduled } =
      await applicationsClient.getAdminCandidateCounts();

    res.json({
      totalJobs,
      activeJobs,
      totalCandidates,
      interviewsScheduled,
      jobsByStatus,
      recentJobs
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

router.get('/user', async (req, res) => {
  try {
    const payload = await applicationsClient.getLegacyUserDashboardCandidateMock();

    const recentApplications = await attachJobsToCandidates(payload.recentApplications);

    res.json({
      ...payload,
      recentApplications
    });
  } catch (error) {
    console.error('Error fetching user dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

export default router;
