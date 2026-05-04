import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Candidate from '../models/Candidate.js';
import * as jobsClient from './jobsClient.js';
import * as authClient from './authClient.js';
import {
  isLikelyJobTitle,
  createExactMatchRegex,
  createPartialMatchRegex,
  normalizeQuery,
  escapeRegExp
} from '../utils/searchUtils.js';
import {
  sanitizeSearchQuery,
  sanitizeNumericFilter,
  sanitizeObjectId,
  sanitizePrefix
} from '@skillsync/shared/security';

function pickJobPopulateShape(job) {
  if (!job) {
    return null;
  }
  return {
    _id: job._id,
    title: job.title,
    department: job.department,
    location: job.location,
    status: job.status
  };
}

async function populateCandidatesJobId(candidates) {
  const ids = [...new Set(candidates.map((c) => String(c.jobId)).filter(Boolean))];
  const jobs = await jobsClient.getJobsByIds(ids);
  const map = new Map(jobs.map((j) => [String(j._id), j]));
  return candidates.map((c) => ({
    ...c,
    jobId: pickJobPopulateShape(map.get(String(c.jobId))) || c.jobId
  }));
}

async function attachJobsToApplications(apps) {
  const jobIds = [...new Set(apps.map((a) => String(a.jobId)).filter(Boolean))];
  const jobs = await jobsClient.getJobsByIds(jobIds);
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

/**
 * Candidate rows are per job; match the logged-in user via auth email and/or
 * application candidateInfo emails, scoped to jobs they applied to.
 */
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
  try {
    const row = await authClient.getUserById(String(userId));
    const u = normalizeEmail(row?.email);
    if (u) {
      emails.add(u);
    }
  } catch {
    // continue with application-stored emails only
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
    underReview: await Application.countDocuments({ userId: oid, status: 'Under Review' }),
    shortlisted: await Application.countDocuments({ userId: oid, status: 'Shortlisted' }),
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

  const recentApplications = await populateCandidatesJobId(recentApplicationsRaw);

  return {
    totalApplications,
    activeApplications,
    interviewsScheduled,
    avgMatchScore,
    applicationsByStatus,
    recentApplications
  };
}

export async function searchCandidatesFiltered({ query, jobId, minScore, maxScore }) {
  const searchCriteria = {};

  const sanitizedQuery = sanitizeSearchQuery(query);
  if (sanitizedQuery) {
    searchCriteria.$text = { $search: sanitizedQuery };
  }

  const sanitizedJobId = sanitizeObjectId(jobId);
  if (sanitizedJobId) {
    searchCriteria.jobId = sanitizedJobId;
  }

  if (minScore !== undefined || maxScore !== undefined) {
    searchCriteria.atsScore = {};
    const sanitizedMin = sanitizeNumericFilter(minScore, 0, 100);
    const sanitizedMax = sanitizeNumericFilter(maxScore, 0, 100);
    if (sanitizedMin !== null) searchCriteria.atsScore.$gte = sanitizedMin;
    if (sanitizedMax !== null) searchCriteria.atsScore.$lte = sanitizedMax;
  }

  let candidates;
  if (sanitizedQuery) {
    candidates = await Candidate.find(searchCriteria, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(20)
      .lean();
  } else {
    candidates = await Candidate.find(searchCriteria).sort({ createdAt: -1 }).limit(20).lean();
  }
  return candidates;
}

export async function unifiedSearchCandidatesPart(sanitizedQuery) {
  const normalizedQuery = normalizeQuery(sanitizedQuery);
  const jobTitleQuery = isLikelyJobTitle(normalizedQuery);

  let candidates = [];

  if (!jobTitleQuery) {
    const exactNameMatches = await Candidate.find({
      $or: [{ name: createExactMatchRegex(sanitizedQuery) }, { searchableName: normalizedQuery }]
    })
      .limit(5)
      .lean();

    if (exactNameMatches.length > 0) {
      candidates = exactNameMatches;
    } else {
      const partialNameMatches = await Candidate.find({
        name: createPartialMatchRegex(sanitizedQuery)
      })
        .limit(8)
        .lean();

      if (partialNameMatches.length > 0) {
        candidates = partialNameMatches;
      } else {
        candidates =
          (await Candidate.find(
            { $text: { $search: sanitizedQuery } },
            { score: { $meta: 'textScore' } }
          )
            .sort({ score: { $meta: 'textScore' } })
            .limit(5)
            .lean()) || [];
      }
    }
  } else {
    candidates = await Candidate.find(
      { $text: { $search: sanitizedQuery } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(3)
      .lean();
  }

  if (candidates.length > 0) {
    return populateCandidatesJobId(candidates);
  }
  return candidates;
}

export async function getCandidateSuggestionsInternal(prefix, jobId) {
  const sanitizedPrefix = sanitizePrefix(prefix);
  if (!sanitizedPrefix) {
    return [];
  }

  const searchCriteria = {
    $or: [
      { name: new RegExp(`^${sanitizedPrefix}`, 'i') },
      { email: new RegExp(`^${sanitizedPrefix}`, 'i') },
      { skills: new RegExp(`^${sanitizedPrefix}`, 'i') }
    ]
  };

  const sanitizedJobId = sanitizeObjectId(jobId);
  if (sanitizedJobId) {
    searchCriteria.jobId = sanitizedJobId;
  }

  const candidates = await Candidate.find(searchCriteria).limit(10);

  const suggestions = new Set();

  candidates.forEach((candidate) => {
    if (candidate.name.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
      suggestions.add(candidate.name);
    }

    if (candidate.email.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
      suggestions.add(candidate.email);
    }

    candidate.skills.forEach((skill) => {
      if (skill.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
        suggestions.add(skill);
      }
    });
  });

  return Array.from(suggestions).slice(0, 10);
}
