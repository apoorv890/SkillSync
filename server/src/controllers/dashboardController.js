import * as JobService from '../services/jobServiceInternal.js';
import * as ApplicationService from '../services/applicationServiceInternal.js';

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

    // recentApplications already has jobs attached inside getUserDashboardApplicationStats
    return res.json(appStats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
}
