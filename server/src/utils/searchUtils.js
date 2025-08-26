/**
 * Search utility functions for HR Portal
 */

// Job title related keywords to help identify job title queries
const JOB_TITLE_KEYWORDS = [
  'engineer', 'developer', 'manager', 'director', 'specialist', 
  'analyst', 'associate', 'intern', 'lead', 'senior', 'junior', 
  'principal', 'architect', 'designer', 'administrator', 'coordinator', 
  'consultant', 'officer', 'head', 'chief', 'vp', 'president', 'executive',
  'assistant', 'supervisor', 'technician', 'representative', 'advisor',
  'recruiter', 'hr', 'human resources', 'sales', 'marketing', 'product',
  'project', 'program', 'operations', 'finance', 'accounting', 'legal',
  'research', 'data', 'science', 'frontend', 'backend', 'fullstack',
  'devops', 'qa', 'quality', 'test', 'support', 'customer', 'client'
];

// Regex pattern for job title detection
const JOB_TITLE_PATTERN = new RegExp(`\\b(${JOB_TITLE_KEYWORDS.join('|')})\\b`, 'i');

/**
 * Determines if a search query is likely a job title
 * @param {string} query - The search query
 * @returns {boolean} - True if the query is likely a job title
 */
const isLikelyJobTitle = (query) => {
  if (!query) return false;
  
  // Check if query contains job title keywords
  if (JOB_TITLE_PATTERN.test(query)) {
    return true;
  }
  
  // Check for common job title patterns
  if (/\b(position|job|role|opening|vacancy)\b/i.test(query)) {
    return true;
  }
  
  return false;
};

/**
 * Escapes special characters in a string for use in a regular expression
 * @param {string} string - The string to escape
 * @returns {string} - The escaped string
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Creates a case-insensitive regular expression for exact matching
 * @param {string} query - The query to match
 * @returns {RegExp} - The regular expression
 */
const createExactMatchRegex = (query) => {
  return new RegExp(`^${escapeRegExp(query)}$`, 'i');
};

/**
 * Creates a case-insensitive regular expression for partial matching
 * @param {string} query - The query to match
 * @returns {RegExp} - The regular expression
 */
const createPartialMatchRegex = (query) => {
  return new RegExp(escapeRegExp(query), 'i');
};

/**
 * Normalizes a search query (trims whitespace, converts to lowercase)
 * @param {string} query - The query to normalize
 * @returns {string} - The normalized query
 */
const normalizeQuery = (query) => {
  return query.trim().toLowerCase();
};

export {
  isLikelyJobTitle,
  escapeRegExp,
  createExactMatchRegex,
  createPartialMatchRegex,
  normalizeQuery,
  JOB_TITLE_KEYWORDS,
  JOB_TITLE_PATTERN
};
