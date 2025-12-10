import logger from '../config/logger.js';
import chalk from 'chalk';

/**
 * Enhanced Logger Helper - Production-ready logging with visual indicators
 * 
 * Features:
 * - User-triggered vs background distinction
 * - Compact single-line logs
 * - Nested log indentation with emojis
 * - Performance warnings
 * - Color-coded HTTP methods
 * - Visual separators between requests
 */

// Method colors
const METHOD_COLORS = {
  GET: chalk.blue,
  POST: chalk.green,
  PUT: chalk.yellow,
  PATCH: chalk.cyan,
  DELETE: chalk.red
};

// Separator line
const SEPARATOR = chalk.gray('─'.repeat(80));

/**
 * Detect if request is user-triggered
 */
const detectUserTriggered = (req) => {
  // Check for custom header from frontend
  if (req.headers['x-user-action'] === 'true') {
    return true;
  }
  
  // Mutations are always user-triggered
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return true;
  }
  
  // Background patterns (polling, auto-refresh)
  const backgroundPatterns = [
    '/api/analytics',
    '/api/dashboard/stats',
  ];
  
  const isBackground = backgroundPatterns.some(pattern => 
    req.originalUrl?.includes(pattern)
  );
  
  return !isBackground;
};

/**
 * Middleware to attach logging context to request
 * Adds: logPrefix, logIndent, startTime
 */
export const attachLogPrefix = (req, res, next) => {
  req.startTime = Date.now();
  
  // Detect if user-triggered
  const isUserTriggered = detectUserTriggered(req);
  req.userTriggered = isUserTriggered;
  req.logPrefix = isUserTriggered ? '==> ' : '    ';
  req.logIndent = isUserTriggered ? '↳ ' : '    ↳ ';
  
  // Log separator and request start for user-triggered requests
  if (isUserTriggered) {
    logger.info(SEPARATOR);
    const methodColor = METHOD_COLORS[req.method] || chalk.white;
    const coloredMethod = methodColor(req.method);
    logger.info(`${req.logPrefix}${coloredMethod} ${req.originalUrl}`);
  }
  
  next();
};


/**
 * Compact log helper - puts key info on same line (uses indent for nested operations)
 * @param {Object} req - Express request object
 * @param {string} message - Log message
 * @param {Object} meta - Metadata
 */
export const logCompact = (req, message, meta = {}) => {
  const indent = req?.logIndent || '    ↳ ';
  
  // Format metadata as key=value pairs
  const metaStr = Object.entries(meta)
    .map(([k, v]) => {
      // Handle string values with quotes if they contain spaces
      const value = typeof v === 'string' && v.includes(' ') ? `"${v}"` : v;
      return `${k}=${value}`;
    })
    .join(' ');
  
  // Single line format: ↳ Job found jobId=123 title="Senior Dev"
  const parts = [indent + message, metaStr].filter(Boolean);
  logger.info(parts.join(' '));
};

/**
 * Nested log helper - shows operation hierarchy
 * @param {Object} req - Express request object
 * @param {string} message - Log message
 * @param {Object} meta - Metadata
 */
export const logNested = (req, message, meta = {}) => {
  const indent = req?.logIndent || '    ↳ ';
  
  // Format metadata as key=value pairs
  const metaStr = Object.entries(meta)
    .map(([k, v]) => {
      // Handle string values with quotes if they contain spaces
      const value = typeof v === 'string' && v.includes(' ') ? `"${v}"` : v;
      return `${k}=${value}`;
    })
    .join(' ');
  
  // Single line format: ↳ Fetching job jobId=123
  const parts = [indent + message, metaStr].filter(Boolean);
  logger.info(parts.join(' '));
};

/**
 * Log request completion with performance indicators
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const logRequestComplete = (req, res) => {
  const duration = Date.now() - req.startTime;
  const prefix = req.logPrefix || '';
  
  // Status emoji
  const statusEmoji = res.statusCode < 400 ? '✓' : '✗';
  
  // Performance warning for slow requests
  const slowWarning = duration > 1000 ? '⚠️ ' : '';
  
  // Log level based on performance
  const level = duration > 1000 ? 'warn' : 'info';
  
  // Color the method
  const methodColor = METHOD_COLORS[req.method] || chalk.white;
  const coloredMethod = methodColor(req.method);
  
  // Compact format: ==> ✓ 200 GET /api/jobs (25ms)
  const message = `${prefix}${slowWarning}${statusEmoji} ${res.statusCode} ${coloredMethod} ${req.originalUrl} ${chalk.gray(`(${duration}ms)`)}`;
  
  // Simple string log, no metadata object
  logger[level](message);
};

export default {
  attachLogPrefix,
  logCompact,
  logNested,
  logRequestComplete,
};
