/**
 * Search utility functions (aligned with jobs-service / applications-service).
 */

const JOB_TITLE_KEYWORDS = [
  'engineer',
  'developer',
  'manager',
  'director',
  'specialist',
  'analyst',
  'associate',
  'intern',
  'lead',
  'senior',
  'junior',
  'principal',
  'architect',
  'designer',
  'administrator',
  'coordinator',
  'consultant',
  'officer',
  'head',
  'chief',
  'vp',
  'president',
  'executive',
  'assistant',
  'supervisor',
  'technician',
  'representative',
  'advisor',
  'recruiter',
  'hr',
  'human resources',
  'sales',
  'marketing',
  'product',
  'project',
  'program',
  'operations',
  'finance',
  'accounting',
  'legal',
  'research',
  'data',
  'science',
  'frontend',
  'backend',
  'fullstack',
  'devops',
  'qa',
  'quality',
  'test',
  'support',
  'customer',
  'client'
];

const JOB_TITLE_PATTERN = new RegExp(`\\b(${JOB_TITLE_KEYWORDS.join('|')})\\b`, 'i');

export const isLikelyJobTitle = (query) => {
  if (!query) return false;
  if (JOB_TITLE_PATTERN.test(query)) {
    return true;
  }
  if (/\\b(position|job|role|opening|vacancy)\\b/i.test(query)) {
    return true;
  }
  return false;
};

export const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
};

export const createExactMatchRegex = (query) => {
  return new RegExp(`^${escapeRegExp(query)}$`, 'i');
};

export const createPartialMatchRegex = (query) => {
  return new RegExp(escapeRegExp(query), 'i');
};

export const normalizeQuery = (query) => {
  return query.trim().toLowerCase();
};

export const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
};

export { JOB_TITLE_KEYWORDS, JOB_TITLE_PATTERN };


