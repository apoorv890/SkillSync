/**
 * Query Sanitization Utilities
 * Prevents NoSQL injection by validating and sanitizing query parameters
 */

const VALID_JOB_STATUSES = ['draft', 'active', 'closed'];

const VALID_APPLICATION_STATUSES = [
  'applied',
  'withdrawn',
  'Under Review',
  'Shortlisted',
  'Rejected',
  'Hired'
];

export function sanitizeJobStatus(status) {
  if (!status || typeof status !== 'string') {
    return null;
  }

  const normalized = status.toLowerCase().trim();

  if (VALID_JOB_STATUSES.includes(normalized)) {
    return normalized;
  }

  return null;
}

export function sanitizeApplicationStatus(status) {
  if (!status || typeof status !== 'string') {
    return null;
  }

  const normalized = status.trim();

  if (VALID_APPLICATION_STATUSES.includes(normalized)) {
    return normalized;
  }

  return null;
}

export function sanitizeDepartment(department) {
  if (!department || typeof department !== 'string') {
    return null;
  }

  const sanitized = department.trim().replace(/[^a-zA-Z0-9\s\-&,]/g, '');

  if (sanitized.length > 100) {
    return null;
  }

  return sanitized.length > 0 ? sanitized : null;
}

export function sanitizeLocation(location) {
  if (!location || typeof location !== 'string') {
    return null;
  }

  const sanitized = location.trim().replace(/[^a-zA-Z0-9\s\-,()]/g, '');

  if (sanitized.length > 100) {
    return null;
  }

  return sanitized.length > 0 ? sanitized : null;
}

export function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return null;
  }

  const sanitized = query.trim().replace(/[<>{}[\]\\]/g, '');

  if (sanitized.length > 200) {
    return null;
  }

  return sanitized.length > 0 ? sanitized : null;
}

export function sanitizeNumericFilter(value, min = 0, max = 100) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const num = parseInt(value, 10);

  if (isNaN(num)) {
    return null;
  }

  if (num < min || num > max) {
    return null;
  }

  return num;
}

export function sanitizeObjectId(id) {
  if (!id || typeof id !== 'string') {
    return null;
  }

  if (!/^[a-f\d]{24}$/i.test(id.trim())) {
    return null;
  }

  return id.trim();
}

export function sanitizePrefix(prefix) {
  if (!prefix || typeof prefix !== 'string') {
    return null;
  }

  const sanitized = prefix.trim().replace(/[.*+?^${}()|[\]\\]/g, '');

  if (sanitized.length > 50) {
    return null;
  }

  return sanitized.length > 0 ? sanitized : null;
}
