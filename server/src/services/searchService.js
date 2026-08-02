import Job from '../models/Job.js';
import {
  sanitizeSearchQuery,
  sanitizePrefix,
  sanitizeJobStatus,
  sanitizeDepartment,
  sanitizeLocation
} from '../utils/querySanitizer.js';

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
      .limit(20)
      .lean();
  } else {
    jobs = await Job.find(searchCriteria).sort({ createdAt: -1 }).limit(20).lean();
  }
  return jobs;
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
