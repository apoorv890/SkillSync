/**
 * Query Sanitization Utilities
 * Prevents NoSQL injection by validating and sanitizing query parameters
 */

import { JOB_STATUS, APPLICATION_STATUS } from '../config/constants.js';
import ApiError from './ApiError.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * Valid job statuses
 */
const VALID_JOB_STATUSES = ['draft', 'active', 'closed'];

/**
 * Valid application statuses
 */
const VALID_APPLICATION_STATUSES = [
  'applied',
  'withdrawn',
  'Under Review',
  'Shortlisted',
  'Rejected',
  'Hired'
];

/**
 * Sanitize job status filter
 * @param {string} status - Status value from query
 * @returns {string|null} Validated status or null
 */
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

/**
 * Sanitize application status filter
 * @param {string} status - Status value from query
 * @returns {string|null} Validated status or null
 */
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

/**
 * Sanitize department filter
 * @param {string} department - Department value from query
 * @returns {string|null} Sanitized department or null
 */
export function sanitizeDepartment(department) {
  if (!department || typeof department !== 'string') {
    return null;
  }
  
  // Remove special characters that could be used for injection
  // Allow alphanumeric, spaces, hyphens, and common department separators
  const sanitized = department.trim().replace(/[^a-zA-Z0-9\s\-&,]/g, '');
  
  // Limit length to prevent DoS
  if (sanitized.length > 100) {
    return null;
  }
  
  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Sanitize location filter
 * @param {string} location - Location value from query
 * @returns {string|null} Sanitized location or null
 */
export function sanitizeLocation(location) {
  if (!location || typeof location !== 'string') {
    return null;
  }
  
  // Allow alphanumeric, spaces, hyphens, commas, and parentheses for city names
  const sanitized = location.trim().replace(/[^a-zA-Z0-9\s\-,()]/g, '');
  
  // Limit length
  if (sanitized.length > 100) {
    return null;
  }
  
  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Sanitize search query string
 * @param {string} query - Search query
 * @returns {string|null} Sanitized query or null
 */
export function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return null;
  }
  
  // Remove potentially dangerous characters but keep search functionality
  // Allow alphanumeric, spaces, and common search characters
  const sanitized = query.trim().replace(/[<>{}[\]\\]/g, '');
  
  // Limit length to prevent DoS
  if (sanitized.length > 200) {
    return null;
  }
  
  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Sanitize numeric filter (min/max score)
 * @param {any} value - Numeric value
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number|null} Validated number or null
 */
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

/**
 * Sanitize MongoDB ObjectId
 * @param {string} id - ObjectId string
 * @returns {string|null} Validated ObjectId or null
 */
export function sanitizeObjectId(id) {
  if (!id || typeof id !== 'string') {
    return null;
  }
  
  // MongoDB ObjectId is 24 hex characters
  if (!/^[a-f\d]{24}$/i.test(id.trim())) {
    return null;
  }
  
  return id.trim();
}

/**
 * Sanitize prefix for type-ahead suggestions
 * @param {string} prefix - Prefix string
 * @returns {string|null} Sanitized prefix or null
 */
export function sanitizePrefix(prefix) {
  if (!prefix || typeof prefix !== 'string') {
    return null;
  }
  
  // Remove regex special characters to prevent injection
  const sanitized = prefix.trim().replace(/[.*+?^${}()|[\]\\]/g, '');
  
  // Limit length
  if (sanitized.length > 50) {
    return null;
  }
  
  return sanitized.length > 0 ? sanitized : null;
}
