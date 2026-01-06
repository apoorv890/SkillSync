/**
 * Safe Logger Utility
 * Sanitizes sensitive data before logging to prevent information disclosure
 */

import logger from '../config/logger.js';

/**
 * Sensitive fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'otp',
  'resetPasswordOTP',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'csrfToken',
  'creditCard',
  'ssn',
  'socialSecurityNumber'
];

/**
 * Redact sensitive values
 * @param {any} value - Value to redact
 * @returns {string} Redacted value
 */
function redactValue(value) {
  if (value === null || value === undefined) {
    return '[NULL]';
  }
  if (typeof value === 'string' && value.length > 0) {
    return '[REDACTED]';
  }
  return '[REDACTED]';
}

/**
 * Recursively sanitize an object, removing or redacting sensitive fields
 * @param {Object} obj - Object to sanitize
 * @param {number} depth - Current depth (prevents infinite recursion)
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, depth = 0) {
  // Prevent deep recursion
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle objects
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key contains sensitive field name
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = redactValue(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize request body for logging
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
export function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  return sanitizeObject(body);
}

/**
 * Sanitize request headers for logging
 * @param {Object} headers - Request headers
 * @returns {Object} Sanitized headers
 */
export function sanitizeRequestHeaders(headers) {
  if (!headers || typeof headers !== 'object') {
    return headers;
  }

  const sanitized = { ...headers };
  
  // Always redact authorization header
  if (sanitized.authorization) {
    sanitized.authorization = '[REDACTED]';
  }
  
  // Always redact cookie header
  if (sanitized.cookie) {
    sanitized.cookie = '[REDACTED]';
  }

  return sanitizeObject(sanitized);
}

/**
 * Sanitize query parameters for logging
 * @param {Object} query - Query parameters
 * @returns {Object} Sanitized query
 */
export function sanitizeQueryParams(query) {
  if (!query || typeof query !== 'object') {
    return query;
  }
  return sanitizeObject(query);
}

/**
 * Safe logger that automatically sanitizes sensitive data
 */
export const safeLogger = {
  /**
   * Log info message with sanitized data
   */
  info: (message, data = {}) => {
    const sanitized = sanitizeObject(data);
    logger.info(message, sanitized);
  },

  /**
   * Log error message with sanitized data
   */
  error: (message, data = {}) => {
    const sanitized = sanitizeObject(data);
    logger.error(message, sanitized);
  },

  /**
   * Log warning message with sanitized data
   */
  warn: (message, data = {}) => {
    const sanitized = sanitizeObject(data);
    logger.warn(message, sanitized);
  },

  /**
   * Log debug message with sanitized data
   */
  debug: (message, data = {}) => {
    const sanitized = sanitizeObject(data);
    logger.debug(message, sanitized);
  }
};

/**
 * Sanitize error object for logging
 * @param {Error} error - Error object
 * @returns {Object} Sanitized error
 */
export function sanitizeError(error) {
  if (!error) {
    return null;
  }

  const sanitized = {
    message: error.message,
    name: error.name,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };

  // Sanitize any additional error properties
  if (error.data) {
    sanitized.data = sanitizeObject(error.data);
  }

  return sanitized;
}
