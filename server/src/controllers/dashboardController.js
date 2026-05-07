import * as JobService from '../services/jobServiceInternal.js';
import * as ApplicationService from '../services/applicationServiceInternal.js';

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
  const jobs = await JobService.getJobsByIds(jobIds);
  const map = new Map(jobs.map((j) => [String(j._id), j]));
  return apps.map((a) => ({
    ...a,
    jobId: pickJobSummary(map.get(rawJobId(a.jobId))) || a.jobId
  }));
}

async function attachJobsToCandidates(rows) {
  const jobIds = [...new Set(rows.map((c) => rawJobId(c.jobId)).filter(Boolean))];
  const jobs = await JobService.getJobsByIds(jobIds);
  const map = new Map(jobs.map((j) => [String(j._id), j]));
  return rows.map((c) => ({
    ...c,
    jobId: pickJobSummary(map.get(rawJobId(c.jobId))) || c.jobId
  }));
}

/**
 * Compact stats for the candidate user-dashboard page (legacy path).
 */
export async function getUserStats(req, res) {
  try {
    if (req.user?.role === 'admin') {
      return res.status(403).json({ error: 'Use /api/dashboard/stats for admin' });
    }

    const userId = req.userId || req.user._id;
    const appStats = await ApplicationService.getUserDashboardApplicationStats(
      String(userId)
    );

    return res.json({
      totalApplications: appStats.totalApplications ?? 0,
      pendingApplications: appStats.activeApplications ?? 0,
      rejectedApplications: appStats.rejectedApplications ?? 0,
      interviewsScheduled: appStats.interviewsScheduled ?? 0
    });
  } catch (error) {
    console.error('Error fetching user-stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
}

export async function getDashboardStats(req, res) {
  try {
    const userRole = req.user?.role;

    if (userRole === 'admin') {
      const { totalJobs, activeJobs, jobsByStatus, recentJobs } =
        await JobService.getAdminDashboardJobStats();
      const { totalCandidates, totalApplications, interviewsScheduled } =
        await ApplicationService.getAdminCandidateCounts();

      return res.json({
        totalJobs,
        activeJobs,
        totalCandidates,
        totalApplications,
        interviewsScheduled,
        jobsByStatus,
        recentJobs
      });
    }

    const userId = req.userId || req.user._id;

    const appStats = await ApplicationService.getUserDashboardApplicationStats(
      String(userId)
    );

    const recentApplications = await attachJobsToApplications(
      appStats.recentApplications
    );

    return res.json({
      ...appStats,
      recentApplications
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
}

export async function getAdminDashboard(req, res) {
  try {
    const { totalJobs, activeJobs, jobsByStatus, recentJobs } =
      await JobService.getAdminDashboardJobStats();

    const { totalCandidates, totalApplications, interviewsScheduled } =
      await ApplicationService.getAdminCandidateCounts();

    res.json({
      totalJobs,
      activeJobs,
      totalCandidates,
      totalApplications,
      interviewsScheduled,
      jobsByStatus,
      recentJobs
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
}

export async function getUserDashboard(req, res) {
  try {
    const payload = await ApplicationService.getLegacyUserDashboardCandidateMock();

    const recentApplications = await attachJobsToCandidates(
      payload.recentApplications
    );

    res.json({
      ...payload,
      recentApplications
    });
  } catch (error) {
    console.error('Error fetching user dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
}

