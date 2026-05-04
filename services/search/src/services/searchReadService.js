import ReadJob from '../models/ReadJob.js';
import ReadCandidate from '../models/ReadCandidate.js';
import {
  isLikelyJobTitle,
  createExactMatchRegex,
  createPartialMatchRegex,
  normalizeQuery
} from '../utils/searchUtils.js';
import {
  sanitizeSearchQuery,
  sanitizeNumericFilter,
  sanitizeObjectId,
  sanitizePrefix,
  sanitizeJobStatus,
  sanitizeDepartment,
  sanitizeLocation
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
  if (!ids.length) {
    return candidates;
  }
  const jobs = await ReadJob.find({ _id: { $in: ids } }).lean();
  const map = new Map(jobs.map((j) => [String(j._id), j]));
  return candidates.map((c) => ({
    ...c,
    jobId: pickJobPopulateShape(map.get(String(c.jobId))) || c.jobId
  }));
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
    jobs = await ReadJob.find(searchCriteria, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(20)
      .lean();
  } else {
    jobs = await ReadJob.find(searchCriteria).sort({ createdAt: -1 }).limit(20).lean();
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

  const exactJobMatches = await ReadJob.find({
    $or: [{ title: createExactMatchRegex(sanitizedQuery) }, { searchableTitle: normalizedQuery }]
  })
    .limit(5)
    .lean();

  if (exactJobMatches.length > 0) {
    return exactJobMatches;
  }

  const partialTitleMatches = await ReadJob.find({
    title: createPartialMatchRegex(sanitizedQuery)
  })
    .limit(8)
    .lean();

  if (partialTitleMatches.length > 0) {
    return partialTitleMatches;
  }

  const jobSearchCriteria = { $text: { $search: sanitizedQuery } };

  if (jobTitleQuery) {
    return ReadJob.find(jobSearchCriteria, {
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
      .limit(10)
      .lean();
  }

  return ReadJob.find(jobSearchCriteria, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(5)
    .lean();
}

export async function getJobSuggestions(prefix) {
  const sanitizedPrefix = sanitizePrefix(prefix);
  if (!sanitizedPrefix) {
    return [];
  }

  const titleRegex = new RegExp(`^${sanitizedPrefix}`, 'i');
  const departmentRegex = new RegExp(`^${sanitizedPrefix}`, 'i');
  const locationRegex = new RegExp(`^${sanitizedPrefix}`, 'i');

  const jobs = await ReadJob.find({
    $or: [
      { title: titleRegex },
      { department: departmentRegex },
      { location: locationRegex },
      { keywords: titleRegex }
    ]
  })
    .limit(10)
    .lean();

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
    candidates = await ReadCandidate.find(searchCriteria, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(20)
      .lean();
  } else {
    candidates = await ReadCandidate.find(searchCriteria).sort({ createdAt: -1 }).limit(20).lean();
  }
  return candidates;
}

export async function unifiedSearchCandidatesPart(sanitizedQuery) {
  const normalizedQuery = normalizeQuery(sanitizedQuery);
  const jobTitleQuery = isLikelyJobTitle(normalizedQuery);

  let candidates = [];

  if (!jobTitleQuery) {
    const exactNameMatches = await ReadCandidate.find({
      $or: [{ name: createExactMatchRegex(sanitizedQuery) }, { searchableName: normalizedQuery }]
    })
      .limit(5)
      .lean();

    if (exactNameMatches.length > 0) {
      candidates = exactNameMatches;
    } else {
      const partialNameMatches = await ReadCandidate.find({
        name: createPartialMatchRegex(sanitizedQuery)
      })
        .limit(8)
        .lean();

      if (partialNameMatches.length > 0) {
        candidates = partialNameMatches;
      } else {
        candidates =
          (await ReadCandidate.find(
            { $text: { $search: sanitizedQuery } },
            { score: { $meta: 'textScore' } }
          )
            .sort({ score: { $meta: 'textScore' } })
            .limit(5)
            .lean()) || [];
      }
    }
  } else {
    candidates = await ReadCandidate.find(
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

  const candidates = await ReadCandidate.find(searchCriteria).limit(10).lean();

  const suggestions = new Set();

  candidates.forEach((candidate) => {
    if (candidate.name?.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
      suggestions.add(candidate.name);
    }

    if (candidate.email?.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
      suggestions.add(candidate.email);
    }

    (candidate.skills || []).forEach((skill) => {
      if (skill.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
        suggestions.add(skill);
      }
    });
  });

  return Array.from(suggestions).slice(0, 10);
}
