import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Candidate from '../models/Candidate.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { escapeRegExp } from '../utils/searchUtils.js';

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
    status: { $in: ['Under Review', 'applied'] }
  });

  const acceptedApplications = await Application.countDocuments({
    userId: oid,
    status: { $in: ['Shortlisted', 'Hired'] }
  });

  const rejectedApplications = await Application.countDocuments({
    userId: oid,
    status: 'Rejected'
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
    applied: await Application.countDocuments({ userId: oid, status: 'applied' }),
    underReview: await Application.countDocuments({
      userId: oid,
      status: 'Under Review'
    }),
    shortlisted: await Application.countDocuments({
      userId: oid,
      status: 'Shortlisted'
    }),
    hired: await Application.countDocuments({ userId: oid, status: 'Hired' }),
    rejected: rejectedApplications,
    withdrawn: await Application.countDocuments({ userId: oid, status: 'withdrawn' })
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
  return {
    totalCandidates: await Candidate.countDocuments(),
    interviewsScheduled: await Candidate.countDocuments({ interviewScheduled: true })
  };
}

export async function getLegacyUserDashboardCandidateMock() {
  const totalApplications = await Candidate.countDocuments();
  const activeApplications = await Candidate.countDocuments({
    interviewScheduled: false
  });
  const interviewsScheduled = await Candidate.countDocuments({
    interviewScheduled: true
  });

  const avgScoreResult = await Candidate.aggregate([
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$atsScore' }
      }
    }
  ]);

  const avgMatchScore =
    avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore) : 0;

  const applicationsByStatus = {
    pending: await Candidate.countDocuments({ interviewScheduled: false }),
    interviewed: await Candidate.countDocuments({ interviewScheduled: true }),
    rejected: 0
  };

  const recentApplicationsRaw = await Candidate.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const jobIds = [...new Set(recentApplicationsRaw.map((c) => String(c.jobId)).filter(Boolean))];
  const jobs = await Job.find({ _id: { $in: jobIds } }).lean();
  const map = new Map(jobs.map((j) => [String(j._id), j]));

  const recentApplications = recentApplicationsRaw.map((c) => ({
    ...c,
    jobId: map.get(String(c.jobId)) || c.jobId
  }));

  return {
    totalApplications,
    activeApplications,
    interviewsScheduled,
    avgMatchScore,
    applicationsByStatus,
    recentApplications
  };
}

