import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import { APPLICATION_STATUS } from '../utils/constants.js';

async function attachJobsToApplications(apps) {
  const jobIds = [...new Set(apps.map((a) => String(a.jobId)).filter(Boolean))];
  const jobs = await Job.find({ _id: { $in: jobIds } }).lean();
  const map = new Map(jobs.map((j) => [String(j._id), j]));
  return apps.map((a) => ({
    ...a,
    jobId: map.get(String(a.jobId)) || a.jobId
  }));
}

/**
 * Interview-scheduling status isn't tracked anywhere after the legacy Candidate
 * model was retired (Stage 5) — booking now happens directly against Google
 * Calendar (GoogleCalendarService.scheduleInterview) with no write-back to
 * Application or CallSession. Returns 0 until a real signal exists to count.
 */
async function countInterviewsScheduledForUser(_userId) {
  return 0;
}

export async function getUserDashboardApplicationStats(userId) {
  const oid = new mongoose.Types.ObjectId(String(userId));

  // Single round-trip for all status counts + average score
  const [facet] = await Application.aggregate([
    { $match: { userId: oid } },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        avgScore: [
          { $match: { 'atsScore.score': { $ne: null } } },
          { $group: { _id: null, avg: { $avg: '$atsScore.score' } } }
        ]
      }
    }
  ]);

  const counts = Object.fromEntries(
    (facet?.byStatus || []).map(({ _id, count }) => [_id, count])
  );

  const totalApplications = Object.values(counts).reduce((s, n) => s + n, 0);

  const activeApplications =
    (counts[APPLICATION_STATUS.UNDER_REVIEW] || 0) +
    (counts[APPLICATION_STATUS.APPLIED] || 0);

  const acceptedApplications =
    (counts[APPLICATION_STATUS.SHORTLISTED] || 0) +
    (counts[APPLICATION_STATUS.HIRED] || 0);

  const rejectedApplications = counts[APPLICATION_STATUS.REJECTED] || 0;

  const averageScore =
    facet?.avgScore?.length > 0 ? Math.round(facet.avgScore[0].avg) : 0;

  const applicationsByStatus = {
    applied:     counts[APPLICATION_STATUS.APPLIED]      || 0,
    underReview: counts[APPLICATION_STATUS.UNDER_REVIEW] || 0,
    shortlisted: counts[APPLICATION_STATUS.SHORTLISTED]  || 0,
    hired:       counts[APPLICATION_STATUS.HIRED]        || 0,
    rejected:    rejectedApplications,
    withdrawn:   counts[APPLICATION_STATUS.WITHDRAWN]    || 0,
  };

  const recentApplicationsRaw = await Application.find({ userId: oid })
    .sort({ appliedAt: -1 })
    .limit(10)
    .lean();

  const recentApplications = await attachJobsToApplications(recentApplicationsRaw);

  const interviewsScheduled = await countInterviewsScheduledForUser(String(userId));

  return {
    totalApplications,
    activeApplications,
    acceptedApplications,
    rejectedApplications,
    averageScore,
    applicationsByStatus,
    recentApplications,
    interviewsScheduled
  };
}

export async function getAdminCandidateCounts() {
  const totalApplications = await Application.countDocuments();
  const uniqueApplicants = await Application.distinct('userId');
  return {
    totalCandidates: uniqueApplicants.length,
    totalApplications,
    // See countInterviewsScheduledForUser above — no reliable signal post-Candidate removal.
    interviewsScheduled: 0
  };
}
