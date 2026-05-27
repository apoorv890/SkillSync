import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Candidate from '../models/Candidate.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { escapeRegExp } from '../utils/searchUtils.js';
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

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  const t = email.trim().toLowerCase();
  return t || null;
}

async function countInterviewsScheduledForUser(userId) {
  const oid = new mongoose.Types.ObjectId(String(userId));

  const apps = await Application.find({ userId: oid })
    .select('jobId candidateInfo.email')
    .lean();

  const jobIdStrings = [
    ...new Set(
      apps
        .map((a) => a.jobId)
        .filter(Boolean)
        .map((jid) => String(jid))
    )
  ];

  if (!jobIdStrings.length) {
    return 0;
  }

  const emails = new Set();
  const row = await User.findById(String(userId)).lean();
  const u = normalizeEmail(row?.email);
  if (u) {
    emails.add(u);
  }

  for (const a of apps) {
    const c = normalizeEmail(a.candidateInfo?.email);
    if (c) {
      emails.add(c);
    }
  }

  if (!emails.size) {
    return 0;
  }

  const jobIdsAsOid = jobIdStrings
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!jobIdsAsOid.length) {
    return 0;
  }

  const emailOr = [...emails].map((em) => ({
    email: new RegExp(`^${escapeRegExp(em)}$`, 'i')
  }));

  return Candidate.countDocuments({
    interviewScheduled: true,
    jobId: { $in: jobIdsAsOid },
    $or: emailOr
  });
}

export async function getUserDashboardApplicationStats(userId) {
  const oid = new mongoose.Types.ObjectId(String(userId));

  const totalApplications = await Application.countDocuments({ userId: oid });

  const activeApplications = await Application.countDocuments({
    userId: oid,
    status: { $in: [APPLICATION_STATUS.UNDER_REVIEW, APPLICATION_STATUS.APPLIED] }
  });

  const acceptedApplications = await Application.countDocuments({
    userId: oid,
    status: { $in: [APPLICATION_STATUS.SHORTLISTED, APPLICATION_STATUS.HIRED] }
  });

  const rejectedApplications = await Application.countDocuments({
    userId: oid,
    status: APPLICATION_STATUS.REJECTED
  });

  const avgScoreResult = await Application.aggregate([
    { $match: { userId: oid } },
    { $match: { 'atsScore.score': { $ne: null } } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$atsScore.score' }
      }
    }
  ]);

  const averageScore =
    avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore) : 0;

  const applicationsByStatus = {
    applied: await Application.countDocuments({ userId: oid, status: APPLICATION_STATUS.APPLIED }),
    underReview: await Application.countDocuments({ userId: oid, status: APPLICATION_STATUS.UNDER_REVIEW }),
    shortlisted: await Application.countDocuments({ userId: oid, status: APPLICATION_STATUS.SHORTLISTED }),
    hired: await Application.countDocuments({ userId: oid, status: APPLICATION_STATUS.HIRED }),
    rejected: rejectedApplications,
    withdrawn: await Application.countDocuments({ userId: oid, status: APPLICATION_STATUS.WITHDRAWN })
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
    interviewsScheduled: await Candidate.countDocuments({ interviewScheduled: true })
  };
}


