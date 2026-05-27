import * as JobService from '../services/jobServiceInternal.js';
import * as ApplicationService from '../services/applicationServiceInternal.js';
import logger from '../utils/logger.js';
import { ApiResponse } from '../utils/http.js';

/**
 * Compact stats for the candidate user-dashboard page (legacy path).
 */
export async function getUserStats(req, res) {
  try {
    if (req.user?.role === 'admin') {
      return ApiResponse.error(res, 'Use /api/dashboard/stats for admin', 403);
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
    logger.error('Error fetching user-stats:', error);
    return ApiResponse.error(res, 'Failed to fetch user statistics', 500);
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
    logger.error('Error fetching dashboard stats:', error);
    return ApiResponse.error(res, 'Failed to fetch dashboard statistics', 500);
  }
}
