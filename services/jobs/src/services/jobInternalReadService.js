import Job from '../models/Job.js';
import {
  isLikelyJobTitle,
  createExactMatchRegex,
  createPartialMatchRegex,
  normalizeQuery
} from './searchUtils.js';
import {
  sanitizeSearchQuery,
  sanitizeJobStatus,
  sanitizeDepartment,
  sanitizeLocation,
  sanitizePrefix
} from '@skillsync/shared/security';

export async function getAdminDashboardJobPayload() {
  const totalJobs = await Job.countDocuments();
  const activeJobs = await Job.countDocuments({ status: 'active' });
  const jobsByStatus = {
    active: await Job.countDocuments({ status: 'active' }),
    draft: await Job.countDocuments({ status: 'draft' }),
    closed: await Job.countDocuments({ status: 'closed' })
  };
  const recentJobs = await Job.aggregate([
    {
      $lookup: {
        from: 'candidates',
        localField: '_id',
        foreignField: 'jobId',
        as: 'candidates'
      }
    },
    {
      $project: {
        title: 1,
        location: 1,
        status: 1,
        createdAt: 1,
        candidateCount: { $size: '$candidates' }
      }
    },
    { $sort: { createdAt: -1 } },
    { $limit: 10 }
  ]);
  return { totalJobs, activeJobs, jobsByStatus, recentJobs };
}

export async function getJobsAnalyticsPayload(range = '90d') {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const jobsData = await Job.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' }
        },
        jobsCreated: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        jobsCreated: 1
      }
    }
  ]);

  const completeData = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    const dateString = date.toISOString().split('T')[0];
    const existingData = jobsData.find((item) => item.date === dateString);
    completeData.push({
      date: dateString,
      jobsCreated: existingData ? existingData.jobsCreated : 0
    });
  }

  return {
    data: completeData,
    totalJobs: completeData.reduce((sum, item) => sum + item.jobsCreated, 0),
    range
  };
}

export async function searchJobsWithFilters({ query, department, location, status }) {
  const searchCriteria = {};

  const sanitizedQuery = sanitizeSearchQuery(query);
  if (sanitizedQuery) {
    searchCriteria.$text = { $search: sanitizedQuery };
  }

  const sanitizedDepartment = sanitizeDepartment(department);
  if (sanitizedDepartment) {
    searchCriteria.department = sanitizedDepartment;
  }

  const sanitizedLocation = sanitizeLocation(location);
  if (sanitizedLocation) {
    searchCriteria.location = sanitizedLocation;
  }

  const sanitizedStatus = sanitizeJobStatus(status);
  if (sanitizedStatus) {
    searchCriteria.status = sanitizedStatus;
  }

  let jobs;
  if (sanitizedQuery) {
    jobs = await Job.find(searchCriteria, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(20);
  } else {
    jobs = await Job.find(searchCriteria).sort({ createdAt: -1 }).limit(20);
  }
  return jobs;
}

export async function unifiedSearchJobsOnly(query) {
  const sanitizedQuery = sanitizeSearchQuery(query);
  if (!sanitizedQuery) {
    return [];
  }

  const normalizedQuery = normalizeQuery(sanitizedQuery);
  const jobTitleQuery = isLikelyJobTitle(normalizedQuery);

  const exactJobMatches = await Job.find({
    $or: [{ title: createExactMatchRegex(sanitizedQuery) }, { searchableTitle: normalizedQuery }]
  }).limit(5);

  if (exactJobMatches.length > 0) {
    return exactJobMatches;
  }

  const partialTitleMatches = await Job.find({
    title: createPartialMatchRegex(sanitizedQuery)
  }).limit(8);

  if (partialTitleMatches.length > 0) {
    return partialTitleMatches;
  }

  const jobSearchCriteria = { $text: { $search: sanitizedQuery } };

  if (jobTitleQuery) {
    return Job.find(jobSearchCriteria, {
      score: { $meta: 'textScore' },
      titleMatch: {
        $cond: {
          if: { $regexMatch: { input: '$title', regex: createPartialMatchRegex(sanitizedQuery) } },
          then: 10,
          else: 0
        }
      }
    })
      .sort({ titleMatch: -1, score: { $meta: 'textScore' } })
      .limit(10);
  }

  return Job.find(jobSearchCriteria, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(5);
}

export async function getJobSuggestions(prefix) {
  const sanitizedPrefix = sanitizePrefix(prefix);
  if (!sanitizedPrefix) {
    return [];
  }

  const titleRegex = new RegExp(`^${sanitizedPrefix}`, 'i');
  const departmentRegex = new RegExp(`^${sanitizedPrefix}`, 'i');
  const locationRegex = new RegExp(`^${sanitizedPrefix}`, 'i');

  const jobs = await Job.find({
    $or: [
      { title: titleRegex },
      { department: departmentRegex },
      { location: locationRegex },
      { keywords: titleRegex }
    ]
  }).limit(10);

  const suggestions = new Set();

  jobs.forEach((job) => {
    if (job.title?.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
      suggestions.add(job.title);
    }
    if (job.department?.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
      suggestions.add(job.department);
    }
    if (job.location?.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
      suggestions.add(job.location);
    }
    job.keywords?.forEach((keyword) => {
      if (keyword.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
        suggestions.add(keyword);
      }
    });
  });

  return Array.from(suggestions).slice(0, 10);
}
